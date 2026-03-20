const mongoose = require("mongoose");

const testSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subject: { type: String, required: true },
    durationMinutes: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    isPublished: { type: Boolean, default: false },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Test", testSchema);
