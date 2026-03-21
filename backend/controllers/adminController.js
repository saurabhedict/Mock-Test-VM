const User = require("../models/User");
const Test = require("../models/Test");
const Question = require("../models/Question");
const TestAttempt = require("../models/TestAttempt");

// @route   GET /api/admin/stats
// @desc    Get dashboard metrics
// @access  Private/Admin
exports.getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: { $ne: "ADMIN" } });
    const totalTests = await Test.countDocuments();
    const totalAttempts = await TestAttempt.countDocuments();
    const totalQuestions = await Question.countDocuments();

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalTests,
        totalAttempts,
        totalQuestions
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   GET /api/admin/tests
// @desc    Get all tests
// @access  Private/Admin
exports.getTests = async (req, res) => {
  try {
    const tests = await Test.find();
    res.json({ success: true, tests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/admin/tests
// @desc    Create a new test
// @access  Private/Admin
exports.createTest = async (req, res) => {
  try {
    const { exam, subject, totalQuestions, duration } = req.body;
    const test = await Test.create({ exam, subject, totalQuestions, duration });
    res.status(201).json({ success: true, test });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   DELETE /api/admin/tests/:id
// @desc    Delete a test
// @access  Private/Admin
exports.deleteTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }
    await test.deleteOne();
    
    // Optionally delete questions associated with this test.
    // Assuming questions are tied by `exam` and `subject`.
    await Question.deleteMany({ exam: test.exam, subject: test.subject });

    res.json({ success: true, message: "Test removed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   GET /api/admin/attempts
// @desc    Get recent test attempts
// @access  Private/Admin
exports.getRecentAttempts = async (req, res) => {
  try {
    const attempts = await TestAttempt.find()
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({ success: true, attempts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/admin/questions
// @desc    Add a question
// @access  Private/Admin
exports.addQuestion = async (req, res) => {
  try {
    const { exam, subject, question, options, correctAnswer, explanation, difficulty } = req.body;
    const newQuestion = await Question.create({
      exam, subject, question, options, correctAnswer, explanation, difficulty
    });
    res.status(201).json({ success: true, question: newQuestion });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
