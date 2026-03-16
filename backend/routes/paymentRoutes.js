const router = require("express").Router()
const {createOrder} = require("../controllers/paymentController")

router.post("/create-order",createOrder)

module.exports = router