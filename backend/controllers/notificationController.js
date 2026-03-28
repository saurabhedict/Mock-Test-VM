const Notification = require("../models/Notification");

// GET all notifications (all users)
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST create notification (admin only)
exports.createNotification = async (req, res) => {
  try {
    const { message, type } = req.body;
    if (!message) return res.status(400).json({ success: false, message: "Message is required" });
    const notification = await Notification.create({
      message,
      type: type || "info",
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE notification (admin only)
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });
    res.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};