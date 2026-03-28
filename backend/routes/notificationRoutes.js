const router = require("express").Router();
const { getNotifications, createNotification, deleteNotification } = require("../controllers/notificationController");
const { protect, admin } = require("../middleware/authMiddleware");

router.get("/", protect, getNotifications);
router.post("/", protect, admin, createNotification);
router.delete("/:id", protect, admin, deleteNotification);

module.exports = router;