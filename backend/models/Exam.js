const mongoose = require("mongoose");

const examSubjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, lowercase: true },
    questionCount: { type: Number, default: 0, min: 0 },
    marksPerQuestion: { type: Number, default: 1, min: 0 },
    negativeMarksPerQuestion: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const examSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    shortName: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    icon: { type: String, trim: true, default: "📝" },
    durationMinutes: { type: Number, required: true, min: 1 },
    totalQuestions: { type: Number, required: true, min: 0 },
    totalMarks: { type: Number, required: true, min: 0 },
    subjects: { type: [examSubjectSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Exam", examSchema);
