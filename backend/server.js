require("dotenv").config()
const express = require("express")
const cors = require("cors")

const connectDB = require("./config/db")

const authRoutes = require("./routes/authRoutes")
const testRoutes = require("./routes/testRoutes")
const paymentRoutes = require("./routes/paymentRoutes")

const app = express()

connectDB()

app.use(cors())
app.use(express.json())

app.use("/api/auth", authRoutes)
app.use("/api/tests", testRoutes)
app.use("/api/payments", paymentRoutes)

app.listen(5000, () => {
  console.log("Server running on port 5000")
})