const Razorpay = require("razorpay")

const razorpay = new Razorpay({
 key_id:process.env.RAZORPAY_KEY,
 key_secret:process.env.RAZORPAY_SECRET
})

exports.createOrder = async (req,res)=>{

 const {amount} = req.body

 const options = {
  amount: amount * 100,
  currency:"INR"
 }

 const order = await razorpay.orders.create(options)

 res.json(order)

}