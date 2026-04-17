const Coupon = require("../models/Coupon");
const Plan = require("../models/Plan");
const { serializeValidity } = require("./planValidity");

const STATIC_FEATURES = {
  counselling: { name: "Complete Counselling Program", price: 4999 },
  "premium-tests": { name: "Premium Mock Test Series", price: 1499 },
  mentorship: { name: "Personal Mentorship", price: 2999 },
  "admission-guide": { name: "College Admission Guidance", price: 1999 },
};

const resolveFeature = async (featureId) => {
  const normalizedFeatureId = String(featureId || "").trim();
  if (!normalizedFeatureId) return null;

  const plan = await Plan.findOne({ id: normalizedFeatureId, isActive: true })
    .select("id name price validityMode fixedExpiryDate validityValue validityUnit")
    .lean();

  if (plan) {
    return {
      id: plan.id,
      name: plan.name,
      price: Number(plan.price || 0),
      source: "plan",
      ...serializeValidity(plan),
    };
  }

  const feature = STATIC_FEATURES[normalizedFeatureId];
  if (!feature) return null;

  return {
    id: normalizedFeatureId,
    name: feature.name,
    price: Number(feature.price || 0),
    source: "static",
    validityMode: null,
    fixedExpiryDate: null,
    validityValue: null,
    validityUnit: null,
  };
};

const resolveCoupon = async ({ code, featureId, userExamPref = "" }) => {
  const normalizedCode = String(code || "").toUpperCase().trim();
  const normalizedExamPref = String(userExamPref || "").trim().toLowerCase();

  if (!normalizedCode) {
    return { status: 400, message: "Coupon code is required" };
  }

  const coupon = await Coupon.findOne({ code: normalizedCode });

  if (!coupon) {
    return { status: 404, message: "Invalid coupon code" };
  }

  if (!coupon.isActive) {
    return { status: 400, message: "This coupon is no longer active" };
  }

  if (coupon.expiresAt && new Date() > coupon.expiresAt) {
    return { status: 400, message: "This coupon has expired" };
  }

  if (coupon.usedCount >= coupon.maxUses) {
    return { status: 400, message: "This coupon has reached its usage limit" };
  }

  const applicableFeatures = Array.isArray(coupon.applicableFeatures) ? coupon.applicableFeatures : [];
  if (applicableFeatures.length > 0 && !applicableFeatures.includes(featureId)) {
    return { status: 400, message: "This coupon is not valid for this item" };
  }

  const applicableExams = Array.isArray(coupon.applicableExams) ? coupon.applicableExams : [];
  if (applicableExams.length > 0) {
    if (!normalizedExamPref) {
      return { status: 400, message: "Set your exam preference in profile to use this coupon" };
    }

    if (!applicableExams.includes(normalizedExamPref)) {
      return { status: 400, message: "This coupon is not valid for your selected exam" };
    }
  }

  return { coupon };
};

const applyCouponToPrice = (coupon, price) => {
  const trustedPrice = Number(price || 0);

  if (coupon.discountType === "percent") {
    const discountAmount = Math.round((trustedPrice * coupon.discountValue) / 100);
    return {
      discountAmount,
      finalPrice: Math.max(0, trustedPrice - discountAmount),
    };
  }

  const discountAmount = Math.min(coupon.discountValue, trustedPrice);
  return {
    discountAmount,
    finalPrice: Math.max(0, trustedPrice - discountAmount),
  };
};

const incrementCouponUsage = async (code) => {
  const normalizedCode = String(code || "").toUpperCase().trim();
  if (!normalizedCode) return;

  await Coupon.findOneAndUpdate(
    { code: normalizedCode },
    { $inc: { usedCount: 1 } }
  );
};

module.exports = {
  applyCouponToPrice,
  incrementCouponUsage,
  resolveCoupon,
  resolveFeature,
};
