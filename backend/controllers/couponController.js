const Coupon = require("../models/Coupon");

// ─────────────────────────────────────────────
// @route  POST /api/coupons/validate
// @desc   Validate a coupon code
// @access Private
// ─────────────────────────────────────────────
exports.validateCoupon = async (req, res) => {
  try {
    const { code, featureId, price } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: "Coupon code is required" });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Invalid coupon code" });
    }

    if (!coupon.isActive) {
      return res.status(400).json({ success: false, message: "This coupon is no longer active" });
    }

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return res.status(400).json({ success: false, message: "This coupon has expired" });
    }

    if (coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ success: false, message: "This coupon has reached its usage limit" });
    }

    if (coupon.applicableFeatures.length > 0 && !coupon.applicableFeatures.includes(featureId)) {
      return res.status(400).json({ success: false, message: "This coupon is not valid for this item" });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === "percent") {
      discountAmount = Math.round((price * coupon.discountValue) / 100);
    } else {
      discountAmount = Math.min(coupon.discountValue, price);
    }

    const finalPrice = price - discountAmount;

    res.json({
      success: true,
      message: "Coupon applied successfully!",
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        finalPrice,
      },
    });
  } catch (error) {
    console.error("ValidateCoupon error:", error);
    res.status(500).json({ success: false, message: "Server error validating coupon" });
  }
};

// ─────────────────────────────────────────────
// @route  POST /api/coupons/create
// @desc   Create a new coupon (admin only — protect with secret key)
// @access Private (admin)
// ─────────────────────────────────────────────
exports.createCoupon = async (req, res) => {
  try {
    const adminKey = req.headers["x-admin-key"];
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { code, discountType, discountValue, maxUses, expiresAt, applicableFeatures } = req.body;

    if (!code || !discountType || !discountValue) {
      return res.status(400).json({ success: false, message: "code, discountType and discountValue are required" });
    }

    const existing = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: "Coupon code already exists" });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase().trim(),
      discountType,
      discountValue,
      maxUses: maxUses || 100,
      expiresAt: expiresAt || null,
      applicableFeatures: applicableFeatures || [],
    });

    res.status(201).json({ success: true, message: "Coupon created successfully", coupon });
  } catch (error) {
    console.error("CreateCoupon error:", error);
    res.status(500).json({ success: false, message: "Server error creating coupon" });
  }
};

// ─────────────────────────────────────────────
// @route  GET /api/coupons/list
// @desc   List all coupons (admin only)
// @access Private (admin)
// ─────────────────────────────────────────────
exports.listCoupons = async (req, res) => {
  try {
    const adminKey = req.headers["x-admin-key"];
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ success: true, coupons });
  } catch (error) {
    console.error("ListCoupons error:", error);
    res.status(500).json({ success: false, message: "Server error listing coupons" });
  }
};

// ─────────────────────────────────────────────
// @route  DELETE /api/coupons/:code
// @desc   Deactivate a coupon (admin only)
// @access Private (admin)
// ─────────────────────────────────────────────
exports.deactivateCoupon = async (req, res) => {
  try {
    const adminKey = req.headers["x-admin-key"];
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    await Coupon.findOneAndUpdate(
      { code: req.params.code.toUpperCase() },
      { isActive: false }
    );

    res.json({ success: true, message: "Coupon deactivated" });
  } catch (error) {
    console.error("DeactivateCoupon error:", error);
    res.status(500).json({ success: false, message: "Server error deactivating coupon" });
  }
};