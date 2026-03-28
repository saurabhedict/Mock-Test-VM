const crypto = require("crypto");
const Razorpay = require("razorpay");
const Payment = require("../models/Payment");
const User = require("../models/User");
const {
  applyCouponToPrice,
  incrementCouponUsage,
  resolveCoupon,
  resolveFeature,
} = require("../utils/pricing");
const {
  calculateAccessExpiry,
  isPurchaseActive,
} = require("../utils/planValidity");

const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY || process.env.RAZORPAY_KEY === "rzp_test_xxxxxxxxxx") {
    throw new Error("Razorpay not configured. Please add RAZORPAY_KEY and RAZORPAY_SECRET to .env");
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET,
  });
};

const buildPurchaseRecord = (payment, purchasedAt = new Date()) => ({
  featureId: payment.featureId,
  featureName: payment.featureName,
  orderId: payment.orderId,
  purchasedAt,
  validityMode: payment.validityMode || null,
  fixedExpiryDate: payment.fixedExpiryDate || null,
  validityValue: payment.validityValue || null,
  validityUnit: payment.validityUnit || null,
  expiresAt: payment.accessExpiresAt || null,
});

exports.createOrder = async (req, res) => {
  try {
    const { featureId, couponCode } = req.body;
    const userId = req.user.id;

    const feature = await resolveFeature(featureId);
    if (!feature) {
      return res.status(400).json({ success: false, message: `Invalid feature selected: "${featureId}"` });
    }

    const user = await User.findById(userId);
    const alreadyPurchased = user.purchases?.some(
      (purchase) => purchase.featureId === featureId && isPurchaseActive(purchase)
    );
    if (alreadyPurchased) {
      return res.status(400).json({ success: false, message: "You have already purchased this feature" });
    }

    const razorpay = getRazorpay();
    const accessExpiresAt = calculateAccessExpiry(feature);
    if (accessExpiresAt && accessExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "This plan has already expired and cannot be purchased",
      });
    }

    let amountToCharge = feature.price;
    let normalizedCouponCode = null;

    if (couponCode) {
      const couponResult = await resolveCoupon({ code: couponCode, featureId: feature.id });
      if (couponResult.status) {
        return res.status(couponResult.status).json({ success: false, message: couponResult.message });
      }

      normalizedCouponCode = couponResult.coupon.code;
      amountToCharge = applyCouponToPrice(couponResult.coupon, feature.price).finalPrice;
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amountToCharge * 100),
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: { userId, featureId: feature.id, featureName: feature.name, couponCode: normalizedCouponCode || "" },
    });

    await Payment.create({
      userId,
      orderId: order.id,
      featureId: feature.id,
      featureName: feature.name,
      amount: amountToCharge,
      couponCode: normalizedCouponCode,
      status: "pending",
      validityMode: feature.validityMode || null,
      fixedExpiryDate: feature.fixedExpiryDate || null,
      validityValue: feature.validityValue || null,
      validityUnit: feature.validityUnit || null,
      accessExpiresAt,
    });

    res.json({
      success: true,
      order: { id: order.id, amount: order.amount, currency: order.currency },
      feature: { id: featureId, name: feature.name, price: feature.price, finalPrice: amountToCharge },
      key: process.env.RAZORPAY_KEY,
    });
  } catch (error) {
    console.error("CreateOrder error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to create payment order" });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.user.id;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await Payment.findOneAndUpdate(
        { orderId: razorpay_order_id },
        { status: "failed", failureReason: "Invalid signature — possible tampering" }
      );
      return res.status(400).json({ success: false, message: "Payment verification failed. Invalid signature." });
    }

    const payment = await Payment.findOne({ orderId: razorpay_order_id });
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment record not found" });
    }

    if (payment.status === "success") {
      return res.json({
        success: true,
        message: "Payment already verified",
        payment: {
          orderId: razorpay_order_id,
          paymentId: payment.paymentId,
          featureId: payment.featureId,
          featureName: payment.featureName,
          amount: payment.amount,
        },
      });
    }

    payment.paymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = "success";
    await payment.save();

    await User.findByIdAndUpdate(userId, {
      $push: {
        purchases: buildPurchaseRecord(payment, new Date()),
      },
    });

    if (payment.couponCode) {
      await incrementCouponUsage(payment.couponCode);
    }

    res.json({
      success: true,
      message: "Payment successful! Feature unlocked.",
      payment: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        featureId: payment.featureId,
        featureName: payment.featureName,
        amount: payment.amount,
      },
    });
  } catch (error) {
    console.error("VerifyPayment error:", error);
    res.status(500).json({ success: false, message: "Payment verification failed" });
  }
};

exports.paymentFailure = async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    await Payment.findOneAndUpdate(
      { orderId },
      { status: "failed", failureReason: reason || "Payment failed or cancelled by user" }
    );
    res.json({ success: true, message: "Payment failure logged" });
  } catch (error) {
    console.error("PaymentFailure error:", error);
    res.status(500).json({ success: false, message: "Failed to log payment failure" });
  }
};

exports.myPurchases = async (req, res) => {
  try {
    const payments = await Payment.find({
      userId: req.user.id,
      status: "success",
    }).sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (error) {
    console.error("MyPurchases error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch purchases" });
  }
};

exports.webhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(200).json({ received: true });

    const signature = req.headers["x-razorpay-signature"];
    const body = JSON.stringify(req.body);
    const expectedSig = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (signature !== expectedSig) {
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const event = req.body.event;
    const entity = req.body.payload?.payment?.entity;

    if (event === "payment.captured" && entity) {
      const payment = await Payment.findOne({ orderId: entity.order_id });
      if (payment && payment.status === "pending") {
        payment.status = "success";
        payment.paymentId = entity.id;
        await payment.save();
        await User.findByIdAndUpdate(payment.userId, {
          $push: {
            purchases: buildPurchaseRecord(payment, new Date()),
          },
        });

        if (payment.couponCode) {
          await incrementCouponUsage(payment.couponCode);
        }
      }
    }

    if (event === "payment.failed" && entity) {
      await Payment.findOneAndUpdate(
        { orderId: entity.order_id },
        { status: "failed", failureReason: entity.error_description }
      );
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ message: "Webhook processing failed" });
  }
};
