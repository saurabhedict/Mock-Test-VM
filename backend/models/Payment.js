const mongoose = require("mongoose")

const PaymentSchema = new mongoose.Schema({
  userId: String,
  amount: Number,
  feature: String,
  razorpayPaymentId: String,
  status: String
})

module.exports = mongoose.model("Payment", PaymentSchema)