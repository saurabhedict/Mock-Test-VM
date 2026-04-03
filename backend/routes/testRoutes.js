const router = require("express").Router();
const { startTest, getTestsByExam, getTestById, getCompletedTestReview } = require("../controllers/testController");
const { protect } = require("../middleware/authMiddleware");
const TestModel = require("../models/Test");
const Exam = require("../models/Exam");
const { setPrivateNoStoreHeaders } = require("../utils/cacheHeaders");
const {
  calculateAttemptSummary,
  buildAttemptQuestionSnapshots,
} = require("../services/scoringService");

const buildTopicBreakdown = (snapshots = []) =>
  Object.values(
    snapshots.reduce((accumulator, snapshot) => {
      if (!accumulator[snapshot.subject]) {
        accumulator[snapshot.subject] = {
          topic: snapshot.subject,
          total: 0,
          correct: 0,
          partial: 0,
          wrong: 0,
          unanswered: 0,
          averageTimeSeconds: 0,
          totalTimeSeconds: 0,
        };
      }

      const bucket = accumulator[snapshot.subject];
      bucket.total += 1;
      bucket.totalTimeSeconds += Number(snapshot.timeSpentSeconds || 0);
      bucket[snapshot.verdict] = (bucket[snapshot.verdict] || 0) + 1;
      bucket.averageTimeSeconds = Math.round((bucket.totalTimeSeconds / Math.max(bucket.total, 1)) * 100) / 100;
      return accumulator;
    }, {})
  );

const buildDifficultyBreakdown = (snapshots = []) =>
  Object.values(
    snapshots.reduce((accumulator, snapshot) => {
      const difficulty = snapshot.difficulty || "unspecified";
      if (!accumulator[difficulty]) {
        accumulator[difficulty] = {
          difficulty,
          total: 0,
          correct: 0,
          partial: 0,
          wrong: 0,
          unanswered: 0,
        };
      }

      const bucket = accumulator[difficulty];
      bucket.total += 1;
      bucket[snapshot.verdict] = (bucket[snapshot.verdict] || 0) + 1;
      return accumulator;
    }, {})
  );

// ── Must be before /:id to avoid "my-attempts" being treated as an ID ──
router.get("/my-attempts", protect, async (req, res) => {
  try {
    setPrivateNoStoreHeaders(res);
    const TestAttempt = require("../models/TestAttempt");
    const attempts = await TestAttempt.find({ userId: req.user._id })
      .select("testId status score totalQuestions totalMarks accuracy testTitle examId startedAt completedAt timeTakenSeconds")
      .sort({ startedAt: -1 });

    const result = attempts.map(a => ({
      _id: a._id,
      status: a.status,
      score: a.score,
      totalQuestions: a.totalQuestions || 0,
      totalMarks: a.totalMarks || 0,
      accuracy: a.accuracy || 0,
      timeTakenSeconds: a.timeTakenSeconds || 0,
      examId: a.examId || "",
      testId: String(a.testId || ""),
      testTitle: a.testTitle || String(a.testId || "Practice Test"),
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
    setPrivateNoStoreHeaders(res);
    const TestAttempt = require("../models/TestAttempt");
    const { testId, answers, timeTaken, perQuestionTimes = [], attemptId, status, violationReason } = req.body;

    if (!testId) {
      return res.status(400).json({ msg: "testId is required" });
    }

    const test = await TestModel.findById(testId).populate("questions").lean();
    if (!test) {
      return res.status(404).json({ msg: "Test not found" });
    }

    const exam = await Exam.findOne({ slug: test.exam }).lean();
    const summary = calculateAttemptSummary(test.questions || [], answers || {}, exam);
    const snapshots = buildAttemptQuestionSnapshots(test.questions || [], answers || {}, exam, perQuestionTimes);
    const accuracyDenominator = summary.correct + summary.partial + summary.wrong;
    const accuracy =
      accuracyDenominator > 0
        ? Math.round(((summary.correct + summary.partial * 0.5) / accuracyDenominator) * 10000) / 100
        : 0;

    const finalStatus = status === "AUTO_SUBMITTED" ? "AUTO_SUBMITTED" : "COMPLETED";
    const attemptPayload = {
      userId: req.user._id,
      testId: String(testId),
      examId: test.exam || "",
      testTitle: test.title || "",
      score: summary.score,
      totalQuestions: (test.questions || []).length,
      totalMarks: summary.totalMarks,
      accuracy,
      status: finalStatus,
      terminationReason: String(violationReason || "").trim(),
      answersSubmitted: answers || {},
      timeTakenSeconds: Number(timeTaken || 0),
      perQuestionTimes: Array.isArray(perQuestionTimes) ? perQuestionTimes.map((value) => Number(value || 0)) : [],
      questionSnapshots: snapshots,
      topicBreakdown: buildTopicBreakdown(snapshots),
      difficultyBreakdown: buildDifficultyBreakdown(snapshots),
      completedAt: new Date(),
      lastActivityAt: new Date(),
    };

    let attempt = null;

    if (attemptId) {
      attempt = await TestAttempt.findOneAndUpdate(
        { _id: attemptId, userId: req.user._id },
        { $set: attemptPayload },
        { new: true }
      );
    }

    if (!attempt) {
      attempt = await TestAttempt.create(attemptPayload);
    }
    res.status(201).json({ success: true, attempt, summary });
  } catch (error) {
    console.error("Submit test error:", error.message);
    res.status(500).json({ msg: "Server Error", error: error.message });
  }
});

router.post("/session/start", protect, async (req, res) => {
  try {
    setPrivateNoStoreHeaders(res);
    const TestAttempt = require("../models/TestAttempt");
    const { testId, startedAt } = req.body;

    if (!testId) {
      return res.status(400).json({ success: false, message: "testId is required" });
    }

    const test = await TestModel.findById(testId).select("title exam questions totalMarks").lean();
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    const safeStartedAt = startedAt ? new Date(startedAt) : new Date();
    const attempt = await TestAttempt.create({
      userId: req.user._id,
      testId: String(testId),
      examId: test.exam || "",
      testTitle: test.title || "",
      totalQuestions: Array.isArray(test.questions) ? test.questions.length : 0,
      totalMarks: Number(test.totalMarks || 0),
      startedAt: Number.isNaN(safeStartedAt.getTime()) ? new Date() : safeStartedAt,
      lastActivityAt: new Date(),
      status: "IN_PROGRESS",
    });

    res.status(201).json({ success: true, attempt });
  } catch (error) {
    console.error("Start test session error:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

router.post("/session/heartbeat", protect, async (req, res) => {
  try {
    setPrivateNoStoreHeaders(res);
    const TestAttempt = require("../models/TestAttempt");
    const { attemptId } = req.body;

    if (!attemptId) {
      return res.status(400).json({ success: false, message: "attemptId is required" });
    }

    const attempt = await TestAttempt.findOneAndUpdate(
      { _id: attemptId, userId: req.user._id, status: "IN_PROGRESS" },
      { $set: { lastActivityAt: new Date() } },
      { new: true }
    );

    if (!attempt) {
      return res.status(404).json({ success: false, message: "Attempt not found" });
    }

    res.json({ success: true, attemptId: attempt._id });
  } catch (error) {
    console.error("Heartbeat error:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

router.get("/exam/:examId", getTestsByExam);
router.get("/:id/review", protect, getCompletedTestReview);
router.get("/start", startTest);
router.get("/:id", getTestById);

module.exports = router;
