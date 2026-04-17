const Coupon = require("../models/Coupon");
const Exam = require("../models/Exam");
const User = require("../models/User");
const {
  applyCouponToPrice,
  resolveCoupon,
  resolveFeature,
} = require("../utils/pricing");

const normalizeCouponPayload = (body = {}) => {
  const code = body.code?.toUpperCase().trim();
  const discountType = body.discountType;
  const discountValue = Number(body.discountValue);
  const maxUses = Number(body.maxUses);
  const applicableFeatures = Array.isArray(body.applicableFeatures)
    ? body.applicableFeatures.map((feature) => String(feature).trim()).filter(Boolean)
    : [];
  const applicableExams = Array.isArray(body.applicableExams)
    ? body.applicableExams.map((examId) => String(examId).trim().toLowerCase()).filter(Boolean)
    : [];
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

  return {
    code,
    discountType,
    discountValue,
    maxUses,
    applicableFeatures,
    applicableExams,
    expiresAt,
  };
};

const validateCouponPayload = ({ code, discountType, discountValue, maxUses, expiresAt }, { isUpdate = false } = {}) => {
  if (!isUpdate && !code) return "Coupon code is required";
  if (!discountType || !["percent", "flat"].includes(discountType)) return "Discount type must be 'percent' or 'flat'";
  if (!Number.isFinite(discountValue) || discountValue <= 0) return "Discount value must be greater than 0";
  if (discountType === "percent" && discountValue > 100) return "Percent discount cannot exceed 100";
  if (!Number.isFinite(maxUses) || maxUses < 1) return "Max uses must be at least 1";
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return "Expiry date is invalid";
  return null;
};

const validateApplicableExams = async (examIds = []) => {
  if (!Array.isArray(examIds) || examIds.length === 0) return null;

  const uniqueExamIds = [...new Set(examIds)];
  const exams = await Exam.find({ slug: { $in: uniqueExamIds }, isActive: true })
    .select("slug")
    .lean();
  const validExamIds = new Set(exams.map((exam) => exam.slug));
  const invalidExamIds = uniqueExamIds.filter((examId) => !validExamIds.has(examId));

  if (invalidExamIds.length > 0) {
    return `Invalid exam(s): ${invalidExamIds.join(", ")}`;
  }

  return null;
};

// ─────────────────────────────────────────────
// @route  POST /api/coupons/validate
// @desc   Validate a coupon code
// @access Private
// ─────────────────────────────────────────────
exports.validateCoupon = async (req, res) => {
  try {
    const { code, featureId } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: "Coupon code is required" });
    }

    const feature = await resolveFeature(featureId);
    if (!feature) {
      return res.status(400).json({ success: false, message: "Invalid item selected" });
    }

    const user = await User.findById(req.user.id).select("examPref").lean();
    const couponResult = await resolveCoupon({
      code,
      featureId: feature.id,
      userExamPref: String(user?.examPref || "").trim().toLowerCase(),
    });
    if (couponResult.status) {
      return res.status(couponResult.status).json({ success: false, message: couponResult.message });
    }

    const { coupon } = couponResult;
    const { discountAmount, finalPrice } = applyCouponToPrice(coupon, feature.price);

    res.json({
      success: true,
      message: "Coupon applied successfully!",
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        finalPrice,
        originalPrice: feature.price,
      },
    });
  } catch (error) {
    console.error("ValidateCoupon error:", error);
    res.status(500).json({ success: false, message: "Server error validating coupon" });
  }
};

// ─────────────────────────────────────────────
exports.createCoupon = async (req, res) => {
  try {
    const payload = normalizeCouponPayload(req.body);
    const validationError = validateCouponPayload(payload);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }
    const examValidationError = await validateApplicableExams(payload.applicableExams);
    if (examValidationError) {
      return res.status(400).json({ success: false, message: examValidationError });
    }

    const existing = await Coupon.findOne({ code: payload.code });
    if (existing) {
      return res.status(409).json({ success: false, message: "Coupon code already exists" });
    }

    const coupon = await Coupon.create({
      code: payload.code,
      discountType: payload.discountType,
      discountValue: payload.discountValue,
      maxUses: payload.maxUses,
      expiresAt: payload.expiresAt,
      applicableFeatures: payload.applicableFeatures,
      applicableExams: payload.applicableExams,
    });

    res.status(201).json({ success: true, message: "Coupon created successfully", coupon });
  } catch (error) {
    console.error("CreateCoupon error:", error);
    res.status(500).json({ success: false, message: "Server error creating coupon" });
  }
};

// ─────────────────────────────────────────────
exports.listCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ success: true, coupons });
  } catch (error) {
    console.error("ListCoupons error:", error);
    res.status(500).json({ success: false, message: "Server error listing coupons" });
  }
};

// ─────────────────────────────────────────────
exports.updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    const payload = normalizeCouponPayload({ ...coupon.toObject(), ...req.body, code: coupon.code });
    const validationError = validateCouponPayload(payload, { isUpdate: true });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }
    const examValidationError = await validateApplicableExams(payload.applicableExams);
    if (examValidationError) {
      return res.status(400).json({ success: false, message: examValidationError });
    }

    coupon.discountType = payload.discountType;
    coupon.discountValue = payload.discountValue;
    coupon.maxUses = payload.maxUses;
    coupon.expiresAt = payload.expiresAt;
    coupon.applicableFeatures = payload.applicableFeatures;
    coupon.applicableExams = payload.applicableExams;
    coupon.isActive = typeof req.body.isActive === "boolean" ? req.body.isActive : coupon.isActive;

    await coupon.save();

    res.json({ success: true, message: "Coupon updated successfully", coupon });
  } catch (error) {
    console.error("UpdateCoupon error:", error);
    res.status(500).json({ success: false, message: "Server error updating coupon" });
  }
};

exports.toggleCouponStatus = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.json({
      success: true,
      message: `Coupon ${coupon.isActive ? "activated" : "deactivated"} successfully`,
      coupon,
    });
  } catch (error) {
    console.error("ToggleCouponStatus error:", error);
    res.status(500).json({ success: false, message: "Server error updating coupon status" });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    res.json({ success: true, message: "Coupon deleted successfully" });
  } catch (error) {
    console.error("DeleteCoupon error:", error);
    res.status(500).json({ success: false, message: "Server error deleting coupon" });
  }
};
