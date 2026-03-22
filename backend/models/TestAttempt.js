const mongoose = require("mongoose");

const testAttemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    testId: { type: mongoose.Schema.Types.Mixed, required: true }, // accepts both ObjectId and string
    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    status: { type: String, enum: ["IN_PROGRESS", "COMPLETED"], default: "IN_PROGRESS" },
    answersSubmitted: { type: Map, of: Number },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TestAttempt", testAttemptSchema);