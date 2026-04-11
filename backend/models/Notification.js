const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["success", "info", "warning"],
      default: "info",
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
