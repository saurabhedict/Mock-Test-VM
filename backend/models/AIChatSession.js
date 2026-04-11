const mongoose = require("mongoose");

const chatAttachmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    kind: {
      type: String,
      enum: ["image", "pdf", "text"],
      required: true,
    },
    mimeType: {
      type: String,
      default: "",
      trim: true,
    },
    size: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const chatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    contextText: {
      type: String,
      default: "",
      trim: true,
    },
    attachments: {
      type: [chatAttachmentSchema],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const aiChatSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      default: "",
      trim: true,
    },
    contextLabel: {
      type: String,
      default: "",
      trim: true,
    },
    lastResponseId: {
      type: String,
      default: "",
      trim: true,
    },
    messages: {
      type: [chatMessageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

aiChatSessionSchema.index({ userId: 1, sessionId: 1 }, { unique: true });

module.exports = mongoose.model("AIChatSession", aiChatSessionSchema);
