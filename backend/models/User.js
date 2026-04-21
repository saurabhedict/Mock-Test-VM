const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { VALIDITY_MODES, VALIDITY_UNITS } = require("../utils/planValidity");
const PASSWORD_POLICY_MESSAGE = "Password must be at least 8 characters and include at least one uppercase letter, one number, and one special character";
const isStrongPassword = (password) => /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true },
    email: { type: String, required: [true, "Email is required"], unique: true, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"] },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      validate: {
        validator: isStrongPassword,
        message: PASSWORD_POLICY_MESSAGE,
      },
      select: false,
    },
    phone: { type: String, trim: true },
    examPref: { type: String, trim: true, default: "" },
    profilePhoto: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: [200, "Bio cannot exceed 200 characters"] },
    examDate: { type: Date, default: null },
    darkMode: { type: Boolean, default: false },
    pincode: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "" },
    purchases: [
      {
        featureId: String,
        featureName: String,
        orderId: String,
        purchasedAt: { type: Date, default: Date.now },
        validityMode: {
          type: String,
          enum: Object.values(VALIDITY_MODES),
          default: null,
        },
        fixedExpiryDate: { type: Date, default: null },
        validityValue: { type: Number, default: null },
        validityUnit: {
          type: String,
          enum: Object.values(VALIDITY_UNITS),
          default: null,
        },
        expiresAt: { type: Date, default: null },
      },
    ],
    isVerified: { type: Boolean, default: false },
    otp: { type: String, select: false },
    otpExpiry: { type: Date, select: false },
    refreshToken: { type: String, select: false },
    profileCompleted: { type: Boolean, default: false },
    gender: String,
    state: String,
    city: String,
    role: { type: String, enum: ["student", "admin"], default: "student" },
    sessionVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
