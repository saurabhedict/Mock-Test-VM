const router = require("express").Router();
const { startTest, getTestsByExam, getTestById } = require("../controllers/testController");
const { protect } = require("../middleware/authMiddleware");

// ── Must be before /:id to avoid "my-attempts" being treated as an ID ──
router.get("/my-attempts", protect, async (req, res) => {
  try {
    const TestAttempt = require("../models/TestAttempt");
    const attempts = await TestAttempt.find({ userId: req.user._id })
      .populate("testId", "title totalMarks")
      .sort({ startedAt: -1 });

    const result = attempts.map(a => ({
      _id: a._id,
      status: a.status,
      score: a.score,
      totalQuestions: a.totalQuestions || a.testId?.totalMarks || 0,
      testTitle: typeof a.testId === "object" ? a.testId?.title : a.testId || "Practice Test",
      startedAt: a.startedAt,
      completedAt: a.completedAt,
    }));

    res.json(result);
  } catch (error) {
    console.error("my-attempts error:", error.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

router.post("/submit", protect, async (req, res) => {
  try {
    const TestAttempt = require("../models/TestAttempt");
    const { testId, answers, score, totalQuestions, timeTaken } = req.body;

    console.log("SUBMIT HIT — user:", req.user._id, "testId:", testId, "score:", score, "total:", totalQuestions);

    if (!testId) {
      return res.status(400).json({ msg: "testId is required" });
    }

    const attempt = await TestAttempt.create({
      userId: req.user._id,
      testId: String(testId),
      score: score || 0,
      totalQuestions: totalQuestions || 0,
      status: "COMPLETED",
      answersSubmitted: answers || {},
      completedAt: new Date(),
    });

    console.log("ATTEMPT SAVED:", attempt._id);
    res.status(201).json({ success: true, attempt });
  } catch (error) {
    console.error("Submit test error:", error.message);
    res.status(500).json({ msg: "Server Error", error: error.message });
  }
});

router.get("/exam/:examId", getTestsByExam);
router.get("/start", startTest);
router.get("/:id", getTestById);

module.exports = router;