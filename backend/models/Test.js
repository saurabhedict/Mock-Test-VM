const mongoose = require("mongoose")

const TestSchema = new mongoose.Schema({
  exam: String,
  subject: String,
  totalQuestions: Number,
  duration: Number
})

module.exports = mongoose.model("Test", TestSchema)