const router = require("express").Router();
const {
  validateCoupon,
} = require("../controllers/couponController");
const { protect } = require("../middleware/authMiddleware");

router.post("/validate", protect, validateCoupon);

module.exports = router;
