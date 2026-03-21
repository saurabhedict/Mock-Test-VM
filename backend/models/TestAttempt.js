const mongoose = require("mongoose");

const testAttemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    testTitle: { type: String, required: true },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    timeTaken: { type: Number, required: true }, // in seconds
  },
  { timestamps: true }
);

module.exports = mongoose.model("TestAttempt", testAttemptSchema);
