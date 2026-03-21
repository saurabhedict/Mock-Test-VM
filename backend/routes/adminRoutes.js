const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middleware/authMiddleware");
const {
  getAdminStats,
  getTests,
  createTest,
  deleteTest,
  getRecentAttempts,
  addQuestion
} = require("../controllers/adminController");

// Apply protect and isAdmin middlewares to all admin routes
router.use(protect, isAdmin);

router.get("/stats", getAdminStats);
router.route("/tests").get(getTests).post(createTest);
router.route("/tests/:id").delete(deleteTest);

router.get("/attempts", getRecentAttempts);

router.post("/questions", addQuestion);

module.exports = router;
