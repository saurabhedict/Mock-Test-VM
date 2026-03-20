const router = require("express").Router();
const {
  createOrder,
  verifyPayment,
  paymentFailure,
  myPurchases,
  webhook,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

router.post("/webhook", webhook);
router.post("/create-order", protect, createOrder);
router.post("/verify", protect, verifyPayment);
router.post("/failure", protect, paymentFailure);
router.get("/my-purchases", protect, myPurchases);

module.exports = router;