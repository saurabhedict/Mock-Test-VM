const Test = require("../models/Question"); // Wait, Test model is in models/Test.js
const TestModel = require("../models/Test");
const Question = require("../models/Question");

exports.getTestsByExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const tests = await TestModel.find({ exam: examId, isPublished: true })
      .populate('questions')
      .lean();
    
    // Add question count
    const testsWithCount = tests.map(t => ({
      ...t,
      totalQuestions: t.questions.length
    }));

    res.json(testsWithCount);
  } catch (error) {
    res.status(500).json({ msg: "Server Error" });
  }
};

exports.getTestById = async (req, res) => {
  try {
    const test = await TestModel.findById(req.params.id).populate('questions');
    if (!test) return res.status(404).json({ msg: "Test not found" });
    res.json(test);
  } catch (error) {
    res.status(500).json({ msg: "Server Error" });
  }
};

exports.startTest = async (req,res)=>{
  const {subject,count} = req.query;
  const questions = await Question.aggregate([
    {$match:{subject}},
    {$sample:{size:parseInt(count)}}
  ]);
  res.json(questions);
};