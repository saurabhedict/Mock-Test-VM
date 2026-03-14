const router = require("express").Router()
const {startTest} = require("../controllers/testController")

router.get("/start",startTest)

module.exports = router