const router = require("express").Router()
const {startTest, getTestsByExam, getTestById} = require("../controllers/testController")

router.get("/exam/:examId", getTestsByExam)
router.get("/:id", getTestById)
router.get("/start",startTest)

module.exports = router