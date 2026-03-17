const { prisma } = require('../config/db');
const Question = require('../models/Question');

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalTests = await prisma.test.count();
    const totalAttempts = await prisma.testAttempt.count();

    res.json({
      totalUsers,
      totalTests,
      totalAttempts,
    });
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @desc    Get all tests
// @route   GET /api/admin/tests
// @access  Private/Admin
exports.getAllTests = async (req, res) => {
  try {
    const tests = await prisma.test.findMany({
      include: {
        _count: {
          select: { questions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tests);
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @desc    Create a new test
// @route   POST /api/admin/tests
// @access  Private/Admin
exports.createTest = async (req, res) => {
  const { title, subject, durationMinutes, totalMarks } = req.body;
  try {
    const test = await prisma.test.create({
      data: {
        title,
        subject,
        durationMinutes: parseInt(durationMinutes),
        totalMarks: parseInt(totalMarks),
      }
    });
    res.status(201).json(test);
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @desc    Delete a test
// @route   DELETE /api/admin/tests/:id
// @access  Private/Admin
exports.deleteTest = async (req, res) => {
  try {
    await prisma.test.delete({
      where: { id: req.params.id }
    });
    res.json({ msg: 'Test removed' });
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @desc    Get all test attempts
// @route   GET /api/admin/attempts
// @access  Private/Admin
exports.getTestAttempts = async (req, res) => {
  try {
    const attempts = await prisma.testAttempt.findMany({
      include: {
        user: { select: { name: true, email: true } },
        test: { select: { title: true } }
      },
      orderBy: { startedAt: 'desc' }
    });
    res.json(attempts);
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};
