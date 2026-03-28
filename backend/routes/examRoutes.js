const router = require("express").Router();
const { listExams, getExamBySlug } = require("../controllers/examController");

router.get("/", listExams);
router.get("/:examId", getExamBySlug);

module.exports = router;
