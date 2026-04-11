const User = require('../models/User');
const Test = require('../models/Test');
const TestAttempt = require('../models/TestAttempt');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const { deleteUserCascade } = require('../services/userDeletionService');
const { stripHtml } = require('../utils/plainText');
const { clearCachedValuesByPrefix } = require('../utils/inMemoryCache');

const slugify = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeSubjects = (subjects = []) =>
  subjects
    .map((subject) => ({
      name: subject?.name?.trim(),
      code: slugify(subject?.code || subject?.name || ""),
      questionCount: Number(subject?.questionCount || 0),
      marksPerQuestion: Number(subject?.marksPerQuestion || 1),
      negativeMarksPerQuestion: Number(subject?.negativeMarksPerQuestion || 0),
    }))
    .filter((subject) => subject.name);

const formatExamResponse = (exam) => ({
  _id: exam._id,
  examId: exam.slug,
  slug: exam.slug,
  examName: exam.name,
  shortName: exam.shortName,
  description: exam.description,
  icon: exam.icon,
  durationMinutes: exam.durationMinutes,
  totalQuestions: exam.totalQuestions,
  totalMarks: exam.totalMarks,
  subjects: exam.subjects,
  isActive: exam.isActive,
});

const clearPublicReadCaches = () => {
  clearCachedValuesByPrefix("exam:");
  clearCachedValuesByPrefix("exams:");
  clearCachedValuesByPrefix("test:");
  clearCachedValuesByPrefix("tests:");
};

const QUESTION_SELECT =
  "exam subject question questionType multipleCorrectScoringMode questionImage options correctAnswer correctAnswers writtenAnswer explanation explanationImage difficulty marksPerQuestion negativeMarksPerQuestion";

const getAllowedSubjects = (test) => {
  const subjects = Array.isArray(test?.subjects) && test.subjects.length ? test.subjects : [test?.subject];
  return subjects.filter(Boolean);
};

const buildNormalizedQuestionPayload = (test, questionData = {}) => {
  const allowedSubjects = getAllowedSubjects(test);
  const resolvedSubject =
    questionData.subject && allowedSubjects.includes(questionData.subject)
      ? questionData.subject
      : allowedSubjects[0];

  const normalizedQuestion = {
    ...questionData,
    exam: test.exam,
    subject: resolvedSubject,
    questionType: questionData.questionType || "single",
    multipleCorrectScoringMode: questionData.multipleCorrectScoringMode || "full_only",
    options: Array.isArray(questionData.options) ? questionData.options : [],
    correctAnswers: Array.isArray(questionData.correctAnswers)
      ? questionData.correctAnswers.map((value) => Number(value))
      : [],
    writtenAnswer: stripHtml(questionData.writtenAnswer || "") ? String(questionData.writtenAnswer).trim() : "",
    marksPerQuestion:
      questionData.marksPerQuestion === "" || questionData.marksPerQuestion === undefined
        ? undefined
        : Number(questionData.marksPerQuestion),
    negativeMarksPerQuestion:
      questionData.negativeMarksPerQuestion === "" || questionData.negativeMarksPerQuestion === undefined
        ? undefined
        : Number(questionData.negativeMarksPerQuestion),
  };

  if (normalizedQuestion.questionType === "single") {
    normalizedQuestion.correctAnswer = Number(questionData.correctAnswer || 0);
    normalizedQuestion.correctAnswers = [normalizedQuestion.correctAnswer];
    normalizedQuestion.multipleCorrectScoringMode = "full_only";
  }

  if (normalizedQuestion.questionType === "multiple") {
    normalizedQuestion.correctAnswer = normalizedQuestion.correctAnswers[0] ?? 0;
  }

  if (normalizedQuestion.questionType === "written") {
    normalizedQuestion.options = [];
    normalizedQuestion.correctAnswers = [];
    normalizedQuestion.correctAnswer = -1;
    normalizedQuestion.multipleCorrectScoringMode = "full_only";
  }

  return normalizedQuestion;
};

// @desc    Get all users (paginated + search)
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, parseInt(req.query.limit) || 20);
    const search = req.query.search?.trim() || "";
    const roleFilter = req.query.role || "";   // "admin" | "student" | ""
    const verifiedFilter =
      req.query.verified === undefined ? null : String(req.query.verified).toLowerCase() === "true";

    const query = {};
    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (roleFilter) query.role = roleFilter;
    if (verifiedFilter !== null) query.isVerified = verifiedFilter;

    const [users, total] = await Promise.all([
      User.find(query)
        .select("name email phone role isVerified purchases createdAt profilePhoto examPref pincode city state country")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(query),
    ]);

    res.json({ success: true, users, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("GetUsers error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account from admin" });
    }

    const summary = await deleteUserCascade(req.params.id);
    res.json({
      success: true,
      message: "User deleted successfully",
      summary,
    });
  } catch (error) {
    console.error("DeleteUser error:", error);
    res.status(error.status || 500).json({ success: false, message: error.message || "Server error" });
  }
};

// @desc    Set a user's role (admin ↔ student)
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
exports.setUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!["admin", "student"].includes(role))
      return res.status(400).json({ success: false, message: "Role must be 'admin' or 'student'" });

    // Prevent admin from demoting themselves
    if (req.params.id === req.user._id.toString() && role === "student")
      return res.status(400).json({ success: false, message: "You cannot remove your own admin role" });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, select: "name email role" }
    );
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, user });
  } catch (error) {
    console.error("SetUserRole error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTests = await Test.countDocuments();
    const totalAttempts = await TestAttempt.countDocuments();

    res.json({
      totalUsers,
      totalTests,
      totalAttempts,
    });
  } catch (error) {
    console.error("Dashboard Stats error:", error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @desc    Get all tests
// @route   GET /api/admin/tests
// @access  Private/Admin
exports.getAllTests = async (req, res) => {
  try {
    const tests = await Test.find().populate({
      path: 'questions',
      select: '_id'
    }).sort({ createdAt: -1 });
    
    // Convert to the response format expected (e.g. including a count)
    const formattedTests = tests.map(test => ({
      ...test.toObject(),
      _count: { questions: test.questions.length }
    }));
    
    res.json(formattedTests);
  } catch (error) {
    console.error("GetAllTests error:", error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

exports.getAllExams = async (req, res) => {
  try {
    const exams = await Exam.find().sort({ createdAt: -1 });
    res.json(exams.map(formatExamResponse));
  } catch (error) {
    console.error("GetAllExams error:", error);
    res.status(500).json({ msg: "Server Error" });
  }
};

exports.createExam = async (req, res) => {
  try {
    const subjects = normalizeSubjects(req.body.subjects);
    if (subjects.length === 0) {
      return res.status(400).json({ msg: "At least one subject is required" });
    }

    const totalQuestions =
      Number(req.body.totalQuestions) ||
      subjects.reduce((sum, subject) => sum + subject.questionCount, 0);
    const totalMarks =
      Number(req.body.totalMarks) ||
      subjects.reduce((sum, subject) => sum + subject.questionCount * subject.marksPerQuestion, 0);
    const slug = slugify(req.body.slug || req.body.name);

    if (!slug) {
      return res.status(400).json({ msg: "Exam name is required" });
    }

    const existing = await Exam.findOne({ slug });
    if (existing) {
      return res.status(400).json({ msg: "An exam with this slug already exists" });
    }

    const exam = await Exam.create({
      slug,
      name: req.body.name?.trim(),
      shortName: (req.body.shortName || req.body.name || "").trim(),
      description: req.body.description?.trim() || "",
      icon: req.body.icon?.trim() || "📝",
      durationMinutes: Number(req.body.durationMinutes || 60),
      totalQuestions,
      totalMarks,
      subjects,
    });

    clearPublicReadCaches();
    res.status(201).json(formatExamResponse(exam));
  } catch (error) {
    console.error("CreateExam error:", error);
    res.status(500).json({ msg: "Server Error" });
  }
};

exports.updateExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ msg: "Exam not found" });
    }

    const subjects = normalizeSubjects(req.body.subjects);
    if (subjects.length === 0) {
      return res.status(400).json({ msg: "At least one subject is required" });
    }

    const nextSlug = slugify(req.body.slug || req.body.name || exam.slug);
    if (!nextSlug) {
      return res.status(400).json({ msg: "Exam name is required" });
    }

    const duplicate = await Exam.findOne({ slug: nextSlug, _id: { $ne: exam._id } });
    if (duplicate) {
      return res.status(400).json({ msg: "An exam with this slug already exists" });
    }

    const totalQuestions =
      Number(req.body.totalQuestions) ||
      subjects.reduce((sum, subject) => sum + subject.questionCount, 0);
    const totalMarks =
      Number(req.body.totalMarks) ||
      subjects.reduce((sum, subject) => sum + subject.questionCount * subject.marksPerQuestion, 0);

    const previousSlug = exam.slug;
    exam.slug = nextSlug;
    exam.name = req.body.name?.trim() || exam.name;
    exam.shortName = (req.body.shortName || req.body.name || exam.shortName).trim();
    exam.description = req.body.description?.trim() || "";
    exam.icon = req.body.icon?.trim() || "📝";
    exam.durationMinutes = Number(req.body.durationMinutes || 60);
    exam.totalQuestions = totalQuestions;
    exam.totalMarks = totalMarks;
    exam.subjects = subjects;

    await exam.save();

    if (previousSlug !== nextSlug) {
      await Test.updateMany({ exam: previousSlug }, { $set: { exam: nextSlug } });
    }

    clearPublicReadCaches();
    res.json(formatExamResponse(exam));
  } catch (error) {
    console.error("UpdateExam error:", error);
    res.status(500).json({ msg: "Server Error" });
  }
};

exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ msg: "Exam not found" });
    }

    const relatedTests = await Test.countDocuments({ exam: exam.slug });
    if (relatedTests > 0) {
      return res.status(400).json({ msg: "Delete related tests first before removing this exam" });
    }

    await Exam.findByIdAndDelete(req.params.id);
    clearPublicReadCaches();
    res.json({ msg: "Exam removed" });
  } catch (error) {
    console.error("DeleteExam error:", error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// @desc    Create a new test
// @route   POST /api/admin/tests
// @access  Private/Admin
exports.createTest = async (req, res) => {
  try {
    const { title, exam, subject, subjects, durationMinutes, totalMarks, shuffleQuestions, shuffleOptions } = req.body;
    const test = await Test.create({
      title,
      exam,
      subject,
      subjects: Array.isArray(subjects) && subjects.length ? subjects : [subject],
      durationMinutes: parseInt(durationMinutes),
      totalMarks: parseInt(totalMarks),
      shuffleQuestions: Boolean(shuffleQuestions),
      shuffleOptions: Boolean(shuffleOptions),
    });
    clearPublicReadCaches();
    res.status(201).json(test);
  } catch (error) {
    console.error("CreateTest error:", error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @desc    Update a test
// @route   PUT /api/admin/tests/:id
// @access  Private/Admin
exports.updateTest = async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim();
    if (!title) {
      return res.status(400).json({ msg: "Test title is required" });
    }

    const test = await Test.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ msg: "Test not found" });
    }

    test.title = title;
    if (req.body?.shuffleQuestions !== undefined) {
      test.shuffleQuestions = Boolean(req.body.shuffleQuestions);
    }
    if (req.body?.shuffleOptions !== undefined) {
      test.shuffleOptions = Boolean(req.body.shuffleOptions);
    }
    await test.save();

    const populatedTest = await Test.findById(test._id)
      .populate({
        path: 'questions',
        select: '_id',
      })
      .lean();

    clearPublicReadCaches();
    res.json({
      ...populatedTest,
      _count: { questions: populatedTest?.questions?.length || 0 },
    });
  } catch (error) {
    console.error("UpdateTest error:", error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @desc    Delete a test
// @route   DELETE /api/admin/tests/:id
// @access  Private/Admin
exports.deleteTest = async (req, res) => {
  try {
    await Test.findByIdAndDelete(req.params.id);
    clearPublicReadCaches();
    res.json({ msg: 'Test removed' });
  } catch (error) {
    console.error("DeleteTest error:", error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @desc    Get all test attempts
// @route   GET /api/admin/attempts
// @access  Private/Admin
exports.getTestAttempts = async (req, res) => {
  try {
    const [liveAttempts, historyAttempts] = await Promise.all([
      TestAttempt.find({ status: "IN_PROGRESS" })
        .select("status terminationReason score totalQuestions totalMarks accuracy timeTakenSeconds testTitle startedAt completedAt lastActivityAt testId userId")
        .populate('userId', 'name email')
        .sort({ lastActivityAt: -1, startedAt: -1 })
        .lean(),
      TestAttempt.find({ status: { $ne: "IN_PROGRESS" } })
        .select("status terminationReason score totalQuestions totalMarks accuracy timeTakenSeconds testTitle startedAt completedAt lastActivityAt testId userId")
        .populate('userId', 'name email')
        .sort({ completedAt: -1, startedAt: -1 })
        .lean(),
    ]);

    const mapAttempt = (attempt) => ({
      ...attempt,
      user: attempt.userId || null,
      test: {
        title: attempt.testTitle || String(attempt.testId || "Practice Test"),
      },
    });

    res.json({
      success: true,
      liveAttempts: liveAttempts.map(mapAttempt),
      historyAttempts: historyAttempts.map(mapAttempt),
    });
  } catch (error) {
    console.error("GetTestAttempts error:", error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

exports.deleteAttemptHistory = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids)
      ? req.body.ids.map((value) => String(value)).filter(Boolean)
      : [];

    if (ids.length === 0) {
      return res.status(400).json({ success: false, message: "At least one history item must be selected" });
    }

    const result = await TestAttempt.deleteMany({
      _id: { $in: ids },
      status: { $ne: "IN_PROGRESS" },
    });

    res.json({
      success: true,
      deletedCount: result.deletedCount || 0,
    });
  } catch (error) {
    console.error("DeleteAttemptHistory error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get questions for a specific test
// @route   GET /api/admin/tests/:id/questions
// @access  Private/Admin
exports.getTestQuestions = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
      .select("questions")
      .populate({
        path: "questions",
        select: QUESTION_SELECT,
        options: { lean: true },
      })
      .lean();

    if (!test) return res.status(404).json({ msg: 'Test not found' });
    res.json(test.questions);
  } catch (error) {
    console.error("GetTestQuestions error:", error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @desc    Update test publish status
// @route   PUT /api/admin/tests/:id/publish
// @access  Private/Admin
exports.updateTestPublished = async (req, res) => {
  try {
    const { isPublished } = req.body;
    const test = await Test.findByIdAndUpdate(
      req.params.id,
      { isPublished },
      { new: true }
    );
    clearPublicReadCaches();
    res.json(test);
  } catch (error) {
    console.error("UpdateTestPublished error:", error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @desc    Add/Update a question
// @route   POST /api/admin/tests/:id/questions
// @access  Private/Admin
exports.saveQuestion = async (req, res) => {
  try {
    const { questionId, ...questionData } = req.body;
    const testId = req.params.id;

    const test = await Test.findById(testId).select("exam subject subjects");
    if (!test) return res.status(404).json({ msg: 'Test not found' });

    const normalizedQuestion = buildNormalizedQuestionPayload(test, questionData);

    let question;
    if (questionId) {
      question = await Question.findByIdAndUpdate(questionId, normalizedQuestion, { new: true });
    } else {
      question = await Question.create(normalizedQuestion);
      await Test.findByIdAndUpdate(testId, {
        $push: { questions: question._id }
      });
    }

    clearPublicReadCaches();
    res.json(question);
  } catch (error) {
    console.error("SaveQuestion error:", error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @desc    Batch add/update questions for a test
// @route   POST /api/admin/tests/:id/questions/batch
// @access  Private/Admin
exports.saveBatchQuestions = async (req, res) => {
  try {
    const testId = req.params.id;
    const questions = Array.isArray(req.body?.questions) ? req.body.questions : [];

    if (questions.length === 0) {
      return res.status(400).json({ msg: "At least one question is required" });
    }

    if (questions.length > 50) {
      return res.status(400).json({ msg: "Max 50 questions per batch" });
    }

    const test = await Test.findById(testId).select("exam subject subjects");
    if (!test) {
      return res.status(404).json({ msg: "Test not found" });
    }

    const results = [];
    const failed = [];
    const newQuestionIds = [];

    const existingQuestions = questions.filter((question) => question.questionId);
    const newQuestions = questions.filter((question) => !question.questionId);

    if (existingQuestions.length > 0) {
      const existingResults = await Promise.allSettled(
        existingQuestions.map(async ({ questionId, clientId, ...questionData }) => {
          const normalizedQuestion = buildNormalizedQuestionPayload(test, questionData);
          const savedQuestion = await Question.findByIdAndUpdate(questionId, normalizedQuestion, { new: true });
          if (!savedQuestion) {
            throw new Error("Question not found");
          }

          return {
            clientId,
            question: savedQuestion,
          };
        })
      );

      existingResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          results.push(result.value);
          return;
        }

        failed.push({
          clientId: existingQuestions[index].clientId,
          questionId: existingQuestions[index].questionId,
          error: result.reason?.message || "Failed to save question",
        });
      });
    }

    for (const { clientId, ...questionData } of newQuestions) {
      try {
        const normalizedQuestion = buildNormalizedQuestionPayload(test, questionData);
        const savedQuestion = await Question.create(normalizedQuestion);
        newQuestionIds.push(savedQuestion._id);
        results.push({
          clientId,
          question: savedQuestion,
        });
      } catch (error) {
        failed.push({
          clientId,
          error: error?.message || "Failed to create question",
        });
      }
    }

    if (newQuestionIds.length > 0) {
      await Test.findByIdAndUpdate(testId, {
        $push: { questions: { $each: newQuestionIds } },
      });
    }

    clearPublicReadCaches();
    res.json({
      success: failed.length === 0,
      results,
      failed,
    });
  } catch (error) {
    console.error("SaveBatchQuestions error:", error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// @desc    Delete a question from a test
// @route   DELETE /api/admin/tests/:id/questions/:questionId
// @access  Private/Admin
exports.deleteQuestion = async (req, res) => {
  try {
    const { id: testId, questionId } = req.params;
    const Question = require('../models/Question');

    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({ msg: 'Test not found' });
    }

    await Test.findByIdAndUpdate(testId, {
      $pull: { questions: questionId },
    });

    const remainingUsage = await Test.countDocuments({ questions: questionId });
    if (remainingUsage === 0) {
      await Question.findByIdAndDelete(questionId);
    }

    clearPublicReadCaches();
    res.json({ msg: 'Question removed' });
  } catch (error) {
    console.error("DeleteQuestion error:", error);
    res.status(500).json({ msg: 'Server Error' });
  }
};
