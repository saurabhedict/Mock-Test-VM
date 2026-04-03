const mongoose = require("mongoose")

const QuestionSchema = new mongoose.Schema({
  exam: String,
  subject: String,
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
  questionImage: String, // URL from Cloudinary
  options: [
    {
      text: String,
      imageUrl: String,
    },
  ],
  correctAnswer: Number,
  correctAnswers: [Number],
  writtenAnswer: String,
  explanation: String,
  explanationImage: String,
  difficulty: String,
  marksPerQuestion: Number,
  negativeMarksPerQuestion: Number,
});

QuestionSchema.index({ exam: 1, subject: 1 });
QuestionSchema.index({ subject: 1 });

module.exports = mongoose.model("Question", QuestionSchema)
