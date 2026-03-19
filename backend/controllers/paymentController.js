const crypto = require("crypto");
const Razorpay = require("razorpay");
const Payment = require("../models/Payment");
const User = require("../models/User");

const FEATURES = {
  // Original services
  "counselling": { name: "Complete Counselling Program", price: 4999 },
  "premium-tests": { name: "Premium Mock Test Series", price: 1499 },
  "mentorship": { name: "Personal Mentorship", price: 2999 },
  "admission-guide": { name: "College Admission Guidance", price: 1999 },

  // New plans
  "foundation": { name: "Foundation Plan", price: 999 },
  "practice-pro": { name: "Practice Pro Plan", price: 1999 },
  "admission-expert": { name: "Admission Expert Plan", price: 3499 },
  "elite": { name: "Elite Strategist Plan", price: 5999 },
};

const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY || process.env.RAZORPAY_KEY === "rzp_test_xxxxxxxxxx") {
    throw new Error("Razorpay not configured. Please add RAZORPAY_KEY and RAZORPAY_SECRET to .env");
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET,
  });
};

exports.createOrder = async (req, res) => {
  try {
    const { featureId, finalPrice, couponCode } = req.body;
    const userId = req.user.id;
    console.log("createOrder:", { featureId, finalPrice, couponCode });

    console.log("createOrder called with featureId:", featureId);
    console.log("req.body:", req.body);

    const feature = FEATURES[featureId];
    if (!feature) {
      console.log("Available features:", Object.keys(FEATURES));
      return res.status(400).json({ success: false, message: `Invalid feature selected: "${featureId}"` });
    }

    const user = await User.findById(userId);
    const alreadyPurchased = user.purchases?.some((p) => p.featureId === featureId);
    if (alreadyPurchased) {
      return res.status(400).json({ success: false, message: "You have already purchased this feature" });
    }
const razorpay = getRazorpay();

// Use finalPrice from frontend if coupon was applied, otherwise use feature price
const amountToCharge = finalPrice && finalPrice < feature.price ? finalPrice : feature.price;

const order = await razorpay.orders.create({
  amount: amountToCharge * 100,
  currency: "INR",
  receipt: `rcpt_${Date.now()}`,
  notes: { userId, featureId, featureName: feature.name },
});

 await Payment.create({
  userId,
  orderId: order.id,
  featureId,
  featureName: feature.name,
  amount: amountToCharge,
  status: "pending",
});

    res.json({
      success: true,
      order: { id: order.id, amount: order.amount, currency: order.currency },
      feature: { id: featureId, name: feature.name, price: feature.price },
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

    payment.paymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = "success";
    await payment.save();

    await User.findByIdAndUpdate(userId, {
      $push: {
        purchases: {
          featureId: payment.featureId,
          featureName: payment.featureName,
          orderId: razorpay_order_id,
          purchasedAt: new Date(),
        },
      },
    });

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
            purchases: {
              featureId: payment.featureId,
              featureName: payment.featureName,
              orderId: entity.order_id,
              purchasedAt: new Date(),
            },
          },
        });
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