const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema({
  exam: String,
  subject: { type: String, index: true },
  topic: { type: String, index: true },

  // Legacy/static fields
  question: String,
  questionType: {
    type: String,
    enum: ["single", "multiple", "written"],
    default: "single",
  },
  multipleCorrectScoringMode: {
    type: String,
    enum: ["full_only", "partial_positive", "partial_with_negative", "no_negative_multiple"],
    default: "full_only",
  },
  questionImage: String,
  correctAnswer: Number,
  correctAnswers: [Number],
  writtenAnswer: String,
  explanation: String,
  explanationImage: String,
  marksPerQuestion: Number,
  negativeMarksPerQuestion: Number,

  // Dynamic engine fields
  questionHTML: String,
  image: String,
  correctOptionId: String,
  explanationHTML: String,
  marks: Number,
  negativeMarks: Number,
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    default: "medium",
    index: true,
  },
  options: [
    {
      optionId: { type: String, trim: true },
      text: String,
      imageUrl: String,
    },
  ],
});

QuestionSchema.index({ exam: 1, subject: 1 });
QuestionSchema.index({ subject: 1, topic: 1, difficulty: 1 });

module.exports = mongoose.model("Question", QuestionSchema);
