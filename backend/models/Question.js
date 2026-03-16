const mongoose = require("mongoose")

const QuestionSchema = new mongoose.Schema({
  exam: String,
  subject: String,
  question: String,
  options: [String],
  correctAnswer: Number,
  explanation: String,
  difficulty: String
})

module.exports = mongoose.model("Question", QuestionSchema)