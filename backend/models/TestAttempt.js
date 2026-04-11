const mongoose = require("mongoose");

const testAttemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    testId: { type: mongoose.Schema.Types.Mixed, required: true }, // accepts both ObjectId and string
    examId: { type: String, default: "" },
    testTitle: { type: String, default: "" },
    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    status: { type: String, enum: ["IN_PROGRESS", "COMPLETED", "AUTO_SUBMITTED"], default: "IN_PROGRESS" },
    terminationReason: { type: String, default: "" },
    answersSubmitted: { type: mongoose.Schema.Types.Mixed },
    timeTakenSeconds: { type: Number, default: 0 },
    lastActivityAt: { type: Date, default: Date.now },
    perQuestionTimes: { type: [Number], default: [] },
    questionSnapshots: { type: [mongoose.Schema.Types.Mixed], default: [] },
    topicBreakdown: { type: [mongoose.Schema.Types.Mixed], default: [] },
    difficultyBreakdown: { type: [mongoose.Schema.Types.Mixed], default: [] },
    aiAnalysis: { type: mongoose.Schema.Types.Mixed, default: null },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

testAttemptSchema.index({ userId: 1, startedAt: -1 });
testAttemptSchema.index({ userId: 1, testId: 1, status: 1, completedAt: -1, updatedAt: -1 });
testAttemptSchema.index({ status: 1, lastActivityAt: -1 });
testAttemptSchema.index({ status: 1, completedAt: -1, startedAt: -1 });

module.exports = mongoose.model("TestAttempt", testAttemptSchema);
