const router = require("express").Router();
const {
  validateCoupon,
  createCoupon,
  listCoupons,
  deactivateCoupon,
} = require("../controllers/couponController");
const protect = require("../middleware/authMiddleware");

router.post("/validate", protect, validateCoupon);
router.post("/create", createCoupon);
router.get("/list", listCoupons);
router.delete("/:code", deactivateCoupon);

module.exports = router;