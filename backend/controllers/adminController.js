const User = require('../models/User');
const Test = require('../models/Test');
const TestAttempt = require('../models/TestAttempt');

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

// @desc    Create a new test
// @route   POST /api/admin/tests
// @access  Private/Admin
exports.createTest = async (req, res) => {
  try {
    const { title, exam, subject, durationMinutes, totalMarks } = req.body;
    const test = await Test.create({
      title,
      exam,
      subject,
      durationMinutes: parseInt(durationMinutes),
      totalMarks: parseInt(totalMarks),
    });
    res.status(201).json(test);
  } catch (error) {
    console.error("CreateTest error:", error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @desc    Delete a test
// @route   DELETE /api/admin/tests/:id
// @access  Private/Admin
exports.deleteTest = async (req, res) => {
  try {
    await Test.findByIdAndDelete(req.params.id);
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
    const attempts = await TestAttempt.find()
      .populate('userId', 'name email')
      .populate('testId', 'title')
      .sort({ startedAt: -1 });
    
    // Map to format compatible with frontend expectations
    const formattedAttempts = attempts.map(attempt => ({
      ...attempt.toObject(),
      user: attempt.userId,
      test: attempt.testId
    }));

    res.json(formattedAttempts);
  } catch (error) {
    console.error("GetTestAttempts error:", error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @desc    Get questions for a specific test
// @route   GET /api/admin/tests/:id/questions
// @access  Private/Admin
exports.getTestQuestions = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).populate('questions');
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

    const Question = require('../models/Question');
    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ msg: 'Test not found' });

    let question;
    if (questionId) {
      question = await Question.findByIdAndUpdate(questionId, {
        ...questionData,
        exam: test.exam,
        subject: test.subject
      }, { new: true });
    } else {
      question = await Question.create({
        ...questionData,
        exam: test.exam,
        subject: test.subject
      });
      await Test.findByIdAndUpdate(testId, {
        $push: { questions: question._id }
      });
    }

    res.json(question);
  } catch (error) {
    console.error("SaveQuestion error:", error);
    res.status(500).json({ msg: 'Server Error' });
  }
};
