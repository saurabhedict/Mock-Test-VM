const mongoose = require("mongoose");
const { VALIDITY_MODES, VALIDITY_UNITS } = require("../utils/planValidity");

const planFeatureSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
}, { _id: true });

const planSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    tagline: { type: String, required: true, trim: true },
    target: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    popular: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    validityMode: {
      type: String,
      enum: Object.values(VALIDITY_MODES),
      default: VALIDITY_MODES.DURATION,
    },
    fixedExpiryDate: { type: Date, default: null },
    validityValue: { type: Number, default: 12, min: 1 },
    validityUnit: {
      type: String,
      enum: Object.values(VALIDITY_UNITS),
      default: VALIDITY_UNITS.MONTHS,
    },
    mockTests: { type: [planFeatureSchema], default: [] },
    counseling: { type: [planFeatureSchema], default: [] },
    benefits: { type: [planFeatureSchema], default: [] },
    howItWorks: { type: [planFeatureSchema], default: [] },
    personas: { type: [planFeatureSchema], default: [] },
    faqs: { type: [planFeatureSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Plan", planSchema);
