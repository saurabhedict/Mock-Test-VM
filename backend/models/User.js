const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true },
    email: { type: String, required: [true, "Email is required"], unique: true, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"] },
    password: { type: String, required: [true, "Password is required"], minlength: [6, "Password must be at least 6 characters"], select: false },
    phone: { type: String, trim: true },
    examPref: { type: String, enum: ["mhtcet", "mah-bba-bca-cet", "jee", "neet", ""], default: "" },
    profilePhoto: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: [200, "Bio cannot exceed 200 characters"] },
    examDate: { type: Date, default: null },
    darkMode: { type: Boolean, default: false },
    streak: { type: Number, default: 0 },
    lastStudyDate: { type: Date, default: null },
    purchases: [
      {
        featureId: String,
        featureName: String,
        orderId: String,
        purchasedAt: { type: Date, default: Date.now },
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
