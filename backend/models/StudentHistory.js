const mongoose = require("mongoose");

const topicStatSchema = new mongoose.Schema(
  {
    attempted: { type: Number, default: 0, min: 0 },
    correct: { type: Number, default: 0, min: 0 },
    averageTimeSeconds: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const studentHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    testId: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true, index: true },
    attemptedQuestionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    topicStats: { type: Map, of: topicStatSchema, default: {} },
  },
  { timestamps: true }
);

studentHistorySchema.index({ userId: 1, testId: 1 }, { unique: true });

module.exports = mongoose.model("StudentHistory", studentHistorySchema);
