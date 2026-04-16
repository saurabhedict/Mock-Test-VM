const mongoose = require("mongoose");

const testSchemaSubjectRuleSchema = new mongoose.Schema(
  {
    totalQuestions: { type: Number, required: true, min: 0 },
    topics: { type: Map, of: Number, default: {} },
  },
  { _id: false }
);

const testSchemaSchema = new mongoose.Schema(
  {
    testId: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true, unique: true, index: true },
    subjects: { type: Map, of: testSchemaSubjectRuleSchema, default: {} },
    totalQuestions: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TestSchema", testSchemaSchema);
