const mongoose = require("mongoose");
const { VALIDITY_MODES, VALIDITY_UNITS } = require("../utils/planValidity");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    paymentId: {
      type: String,
      default: null,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    featureId: {
      type: String,
      required: true,
    },
    featureName: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "cancelled"],
      default: "pending",
    },
    failureReason: {
      type: String,
      default: null,
    },
    couponCode: {
      type: String,
      default: null,
    },
    validityMode: {
      type: String,
      enum: Object.values(VALIDITY_MODES),
      default: null,
    },
    fixedExpiryDate: {
      type: Date,
      default: null,
    },
    validityValue: {
      type: Number,
      default: null,
    },
    validityUnit: {
      type: String,
      enum: Object.values(VALIDITY_UNITS),
      default: null,
    },
    accessExpiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
