const router = require("express").Router();
const {
  register, verifyOTP, resendOTP,
  forgotPassword, resetPassword,
  login, refreshToken, logout,
  getMe, updateProfile, uploadPhoto, updateSettings,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.post("/register", register);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put("/settings", protect, updateSettings);
router.post("/upload-photo", protect, (req, res, next) => {
  upload.single("photo")(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, uploadPhoto);

module.exports = router;