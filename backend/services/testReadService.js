const mongoose = require("mongoose");
const TestModel = require("../models/Test");
const Exam = require("../models/Exam");
const { getOrSetCachedValue } = require("../utils/inMemoryCache");
const { toIdString } = require("../utils/toIdString");

const EXAM_SELECT = "slug name shortName durationMinutes totalQuestions totalMarks subjects availabilityStatus";
const TEST_SELECT =
  "title exam subject subjects durationMinutes totalMarks shuffleQuestions shuffleOptions questions";
const PUBLIC_TEST_QUESTION_SELECT =
  "question questionType questionImage options subject marksPerQuestion negativeMarksPerQuestion multipleCorrectScoringMode";
const REVIEW_TEST_QUESTION_SELECT =
  "question questionType questionImage options correctAnswer correctAnswers writtenAnswer subject explanation explanationImage marksPerQuestion negativeMarksPerQuestion multipleCorrectScoringMode";
const SCORING_TEST_QUESTION_SELECT =
  "question questionType questionImage options correctAnswer correctAnswers writtenAnswer subject explanation explanationImage difficulty marksPerQuestion negativeMarksPerQuestion multipleCorrectScoringMode";

const EXAM_CACHE_TTL_MS = 5 * 60 * 1000;
const PLAN_OR_CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;
const TEST_LIST_CACHE_TTL_MS = 60 * 1000;
const TEST_DETAIL_CACHE_TTL_MS = 60 * 1000;

const mapSubjects = (test) => (test.subjects?.length ? test.subjects : [test.subject]);
const normalizeQuestion = (question) =>
  question
    ? {
        ...question,
        _id: toIdString(question._id),
      }
    : question;
const normalizeTestDocument = (test) => ({
  ...test,
  _id: toIdString(test._id),
  exam: String(test.exam || ""),
  subject: String(test.subject || ""),
  questions: Array.isArray(test.questions) ? test.questions.map(normalizeQuestion) : test.questions,
});

const buildExamDetails = (exam) =>
  exam
    ? {
        examId: exam.slug,
        examName: exam.name,
        shortName: exam.shortName,
        durationMinutes: exam.durationMinutes,
        totalQuestions: exam.totalQuestions,
        totalMarks: exam.totalMarks,
        subjects: exam.subjects,
        availabilityStatus: exam.availabilityStatus || "available",
      }
    : null;

const buildTestResponse = (test, exam) => ({
  ...normalizeTestDocument(test),
  subjects: mapSubjects(test),
  examDetails: buildExamDetails(exam),
});

const loadExamBySlug = async (slug) => {
  if (!slug) {
    return null;
  }

  return getOrSetCachedValue(`exam:${slug}`, EXAM_CACHE_TTL_MS, async () => {
    const isObjectId = mongoose.Types.ObjectId.isValid(slug);
    const query = isObjectId ? { $or: [{ slug }, { _id: slug }] } : { slug };
    return Exam.findOne(query)
      .select(EXAM_SELECT)
      .lean();
  });
};

const getTestsByExamSummary = async (examId) =>
  getOrSetCachedValue(`tests:exam:${examId}`, TEST_LIST_CACHE_TTL_MS, async () => {
    const tests = await TestModel.aggregate([
      { $match: { exam: examId, isPublished: true } },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          title: 1,
          exam: 1,
          subject: 1,
          subjects: 1,
          durationMinutes: 1,
          totalMarks: 1,
          shuffleQuestions: 1,
          shuffleOptions: 1,
          isPublished: 1,
          createdAt: 1,
          totalQuestions: { $size: { $ifNull: ["$questions", []] } },
        },
      },
    ]);

    return tests.map((test) => ({
      ...test,
      _id: toIdString(test._id),
      exam: String(test.exam || ""),
      subject: String(test.subject || ""),
      subjects: test.subjects?.length ? test.subjects : [test.subject],
    }));
  });

const loadTestWithQuestions = async (testId, questionSelect) => {
  const test = await TestModel.findById(testId)
    .select(TEST_SELECT)
    .populate({
      path: "questions",
      select: questionSelect,
    })
    .lean();

  if (!test) {
    return null;
  }

  const exam = await loadExamBySlug(test.exam);

  return {
    test,
    exam,
  };
};

const getPublicTestBundle = async (testId) =>
  getOrSetCachedValue(`test:public:${testId}`, TEST_DETAIL_CACHE_TTL_MS, async () => {
    const bundle = await loadTestWithQuestions(testId, PUBLIC_TEST_QUESTION_SELECT);
    if (!bundle) {
      return null;
    }

    return buildTestResponse(bundle.test, bundle.exam);
  });

const getReviewTestBundle = async (testId) =>
  getOrSetCachedValue(`test:review:${testId}`, TEST_DETAIL_CACHE_TTL_MS, async () => {
    const bundle = await loadTestWithQuestions(testId, REVIEW_TEST_QUESTION_SELECT);
    if (!bundle) {
      return null;
    }

    return buildTestResponse(bundle.test, bundle.exam);
  });

const getScoringTestBundle = async (testId) =>
  getOrSetCachedValue(`test:scoring:${testId}`, TEST_DETAIL_CACHE_TTL_MS, async () => {
    return loadTestWithQuestions(testId, SCORING_TEST_QUESTION_SELECT);
  });

const getSessionStartSummary = async (testId) => {
  if (!mongoose.Types.ObjectId.isValid(testId)) {
    return null;
  }

  return getOrSetCachedValue(`test:session:${testId}`, TEST_DETAIL_CACHE_TTL_MS, async () => {
    const [test] = await TestModel.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(testId) } },
      {
        $project: {
          title: 1,
          exam: 1,
          totalMarks: 1,
          totalQuestions: { $size: { $ifNull: ["$questions", []] } },
        },
      },
    ]);

    return test || null;
  });
};

module.exports = {
  EXAM_SELECT,
  TEST_SELECT,
  PUBLIC_TEST_QUESTION_SELECT,
  REVIEW_TEST_QUESTION_SELECT,
  PLAN_OR_CATALOG_CACHE_TTL_MS,
  buildTestResponse,
  loadExamBySlug,
  getTestsByExamSummary,
  getPublicTestBundle,
  getReviewTestBundle,
  getScoringTestBundle,
  getSessionStartSummary,
};
