const router = require("express").Router();
const { protect, admin } = require("../middleware/authMiddleware");
const {
  getPlans,
  getPlansForAdmin,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
} = require("../controllers/planController");

// Public
router.get("/", getPlans);
router.get("/manage/all", protect, admin, getPlansForAdmin);
router.get("/:id", getPlanById);

// Admin only
router.post("/", protect, admin, createPlan);
router.put("/:id", protect, admin, updatePlan);
router.delete("/:id", protect, admin, deletePlan);

module.exports = router;
