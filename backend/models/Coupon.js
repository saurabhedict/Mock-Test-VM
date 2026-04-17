const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ["percent", "flat"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
    },
    maxUses: {
      type: Number,
      default: 100,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    applicableFeatures: {
      type: [String],
      default: [], // empty = applies to all features
    },
    applicableExams: {
      type: [String],
      default: [], // empty = applies to all exam preferences
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);
