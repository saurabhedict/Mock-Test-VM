const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { generateAccessToken, generateRefreshToken, setRefreshTokenCookie } = require("../utils/generateToken");
const { sendOTPEmail } = require("../utils/sendEmail");
const { sendOTPSMS } = require("../utils/sendSMS");

const generateOTP = () => crypto.randomInt(100000, 999999).toString();

exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, examPref, otpMethod } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: "Name, email and password are required" });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    if (otpMethod === "sms" && !phone)
      return res.status(400).json({ success: false, message: "Phone number is required to receive OTP via SMS" });

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser && existingUser.isVerified)
      return res.status(409).json({ success: false, message: "An account with this email already exists" });

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    let user;
    if (existingUser && !existingUser.isVerified) {
      existingUser.name = name; existingUser.password = password;
      existingUser.phone = phone; existingUser.examPref = examPref;
      existingUser.otp = otp; existingUser.otpExpiry = otpExpiry;
      user = await existingUser.save();
    } else {
      user = await User.create({ name, email, password, phone, examPref, otp, otpExpiry });
    }

    if (otpMethod === "sms") {
      await sendOTPSMS(phone, otp, name);
      return res.status(201).json({ success: true, message: "OTP sent to your phone number.", email, otpMethod: "sms" });
    } else {
      await sendOTPEmail(email, otp, name);
      return res.status(201).json({ success: true, message: `OTP sent to ${email}.`, email, otpMethod: "email" });
    }
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ success: false, message: error.message || "Server error during registration" });
  }
};


exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP are required" });
    const user = await User.findOne({ email: email.toLowerCase() }).select("+otp +otpExpiry");
    if (!user) return res.status(404).json({ success: false, message: "No registration found for this email" });
    if (user.otp !== otp) return res.status(400).json({ success: false, message: "Invalid OTP" });
    if (user.otpExpiry < new Date()) return res.status(400).json({ success: false, message: "OTP has expired. Please register again." });

    user.isVerified = true; user.otp = undefined; user.otpExpiry = undefined;
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    setRefreshTokenCookie(res, refreshToken);

    res.json({
      success: true, message: "Email verified! Welcome to Vidyarthi Mitra.", accessToken,
      user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, examPref: user.examPref, purchases: user.purchases },
    });
  } catch (error) {
    console.error("VerifyOTP error:", error);
    res.status(500).json({ success: false, message: "Server error during OTP verification" });
  }
};

exports.resendOTP = async (req, res) => {
  try {
    const { email, otpMethod } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: "No registration found for this email" });
    if (user.isVerified) return res.status(400).json({ success: false, message: "This account is already verified" });
    const otp = generateOTP();
    user.otp = otp; user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    if (otpMethod === "sms" && user.phone) { await sendOTPSMS(user.phone, otp, user.name); }
    else { await sendOTPEmail(email, otp, user.name); }
    res.json({ success: true, message: "New OTP sent" });
  } catch (error) {
    console.error("ResendOTP error:", error);
    res.status(500).json({ success: false, message: "Server error resending OTP" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email, otpMethod } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json({ success: true, message: "If this email exists, an OTP has been sent.", email });
    if (otpMethod === "sms" && !user.phone)
      return res.status(400).json({ success: false, message: "No phone number on this account. Please use email." });
    const otp = generateOTP();
    user.otp = otp; user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    if (otpMethod === "sms" && user.phone) { await sendOTPSMS(user.phone, otp, user.name); }
    else { await sendOTPEmail(email, otp, user.name); }
    const maskedPhone = user.phone ? user.phone.replace(/(\+?\d{2})\d+(\d{4})/, "$1XXXXXX$2") : null;
    res.json({ success: true, message: `Password reset OTP sent. Please check your ${otpMethod === "sms" ? "phone" : "email"}.`, email, maskedPhone });
  } catch (error) {
    console.error("ForgotPassword error:", error);
    res.status(500).json({ success: false, message: "Server error sending reset OTP" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ success: false, message: "Email, OTP and new password are required" });
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    const user = await User.findOne({ email: email.toLowerCase() }).select("+otp +otpExpiry");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.otp !== otp) return res.status(400).json({ success: false, message: "Invalid OTP" });
    if (user.otpExpiry < new Date()) return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
    user.password = newPassword; user.otp = undefined; user.otpExpiry = undefined; user.refreshToken = undefined;
    await user.save();
    res.json({ success: true, message: "Password reset successfully! Please log in with your new password." });
  } catch (error) {
    console.error("ResetPassword error:", error);
    res.status(500).json({ success: false, message: "Server error resetting password" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password are required" });
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password +refreshToken");
    if (!user) return res.status(401).json({ success: false, message: "Invalid email or password" });
    if (!user.isVerified) return res.status(401).json({ success: false, message: "Please verify your email before logging in", needsVerification: true, email: user.email });
    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid email or password" });
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    setRefreshTokenCookie(res, refreshToken);
    res.json({
      success: true, message: "Logged in successfully", accessToken,
      user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, examPref: user.examPref, profilePhoto: user.profilePhoto, bio: user.bio, streak: user.streak, darkMode: user.darkMode, purchases: user.purchases },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Server error during login" });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ success: false, message: "No refresh token — please log in again" });
    let decoded;
    try { decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET); }
    catch { return res.status(401).json({ success: false, message: "Refresh token expired — please log in again" }); }
    const user = await User.findById(decoded.id).select("+refreshToken");
    if (!user || user.refreshToken !== token) {
      res.clearCookie("refreshToken");
      return res.status(401).json({ success: false, message: "Invalid refresh token — please log in again" });
    }
    res.json({ success: true, accessToken: generateAccessToken(user._id) });
  } catch (error) {
    console.error("Refresh error:", error);
    res.status(500).json({ success: false, message: "Server error during token refresh" });
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) await User.findOneAndUpdate({ refreshToken: token }, { refreshToken: null });
    res.clearCookie("refreshToken", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" });
    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ success: false, message: "Server error during logout" });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({
      success: true,
      user: {
        _id: user._id, name: user.name, email: user.email,
        phone: user.phone, examPref: user.examPref,
        profilePhoto: user.profilePhoto, bio: user.bio,
        streak: user.streak, lastStudyDate: user.lastStudyDate,
        darkMode: user.darkMode, purchases: user.purchases,
        profileCompleted: user.profileCompleted, createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("GetMe error:", error);
    res.status(500).json({ success: false, message: "Server error fetching profile" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, examPref, bio } = req.body;
    const updates = {};
    if (name) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (examPref !== undefined) updates.examPref = examPref;
    if (bio !== undefined) updates.bio = bio;
    if (req.body.profilePhoto !== undefined) updates.profilePhoto = req.body.profilePhoto;
    const user = await User.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "Profile updated", user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, examPref: user.examPref, bio: user.bio, profilePhoto: user.profilePhoto } });
  } catch (error) {
    console.error("UpdateProfile error:", error);
    res.status(500).json({ success: false, message: "Server error updating profile" });
  }
};

exports.uploadPhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No image file provided" });
    const photoUrl = req.file.path;
    const user = await User.findByIdAndUpdate(req.user.id, { profilePhoto: photoUrl }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "Profile photo updated successfully", profilePhoto: photoUrl });
  } catch (error) {
    console.error("UploadPhoto error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { examDate, darkMode, streak, lastStudyDate } = req.body;
    const updates = {};
    if (examDate !== undefined) updates.examDate = examDate;
    if (darkMode !== undefined) updates.darkMode = darkMode;
    if (streak !== undefined) updates.streak = streak;
    if (lastStudyDate !== undefined) updates.lastStudyDate = lastStudyDate;
    const user = await User.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "Settings updated" });
  } catch (error) {
    console.error("UpdateSettings error:", error);
    res.status(500).json({ success: false, message: "Server error updating settings" });
  }
};