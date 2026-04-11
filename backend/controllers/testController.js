const TestAttempt = require("../models/TestAttempt");
const Question = require("../models/Question");
const { setPrivateNoStoreHeaders, setSharedCacheHeaders } = require("../utils/cacheHeaders");
const { toIdString } = require("../utils/toIdString");
const {
  getTestsByExamSummary,
  getPublicTestBundle,
  getReviewTestBundle,
} = require("../services/testReadService");

exports.getTestsByExam = async (req, res) => {
  try {
    setSharedCacheHeaders(res, { maxAgeSeconds: 120, staleWhileRevalidateSeconds: 900 });

    const { examId } = req.params;
    const tests = await getTestsByExamSummary(examId);
    res.json(tests);
  } catch (error) {
    console.error("GetTestsByExam error:", error);
    res.status(500).json({ msg: "Server Error" });
  }
};

exports.getTestById = async (req, res) => {
  try {
    setSharedCacheHeaders(res, { maxAgeSeconds: 120, staleWhileRevalidateSeconds: 600 });

    const test = await getPublicTestBundle(req.params.id);
    if (!test) {
      return res.status(404).json({ msg: "Test not found" });
    }

    res.json(test);
  } catch (error) {
    console.error("GetTestById error:", error);
    res.status(500).json({ msg: "Server Error" });
  }
};

exports.getCompletedTestReview = async (req, res) => {
  try {
    setPrivateNoStoreHeaders(res);

    const reviewFilter = {
      userId: req.user._id,
      testId: String(req.params.id),
      status: { $in: ["COMPLETED", "AUTO_SUBMITTED"] },
    };

    if (req.query.attemptId) {
      reviewFilter._id = req.query.attemptId;
    }

    const attempt = await TestAttempt.findOne(reviewFilter)
      .select("_id status terminationReason completedAt updatedAt")
      .sort({ completedAt: -1, updatedAt: -1 })
      .lean();

    if (!attempt) {
      return res.status(404).json({ msg: "Completed attempt not found" });
    }

    const test = await getReviewTestBundle(req.params.id);
    if (!test) {
      return res.status(404).json({ msg: "Test not found" });
    }

    res.json({
      ...test,
      attempt: {
        _id: toIdString(attempt._id),
        status: attempt.status,
        terminationReason: attempt.terminationReason || "",
        completedAt: attempt.completedAt,
      },
    });
  } catch (error) {
    console.error("GetCompletedTestReview error:", error);
    res.status(500).json({ msg: "Server Error" });
  }
};

exports.startTest = async (req, res) => {
  const { subject, count } = req.query;
  const questions = await Question.aggregate([
    { $match: { subject } },
    { $sample: { size: parseInt(count, 10) } },
  ]);
  res.json(questions);
};
