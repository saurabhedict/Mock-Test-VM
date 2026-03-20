const mongoose = require("mongoose")

const QuestionSchema = new mongoose.Schema({
  exam: String,
  subject: String,
  question: String,
  questionImage: String, // URL from Cloudinary
  options: [
    {
      text: String,
      imageUrl: String,
    },
  ],
  correctAnswer: Number,
  explanation: String,
  explanationImage: String,
  difficulty: String,
});

module.exports = mongoose.model("Question", QuestionSchema)