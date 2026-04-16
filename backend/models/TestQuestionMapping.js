const mongoose = require("mongoose");

const testQuestionMappingSchema = new mongoose.Schema(
  {
    testId: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true, index: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true, index: true },
  },
  { timestamps: true }
);

testQuestionMappingSchema.index({ testId: 1, questionId: 1 }, { unique: true });

module.exports = mongoose.model("TestQuestionMapping", testQuestionMappingSchema);
