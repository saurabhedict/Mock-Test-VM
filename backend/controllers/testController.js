const Question = require("../models/Question");
const TestAttempt = require("../models/TestAttempt");

exports.startTest = async (req,res)=>{

 const {subject,count} = req.query

 const questions = await Question.aggregate([
   {$match:{subject}},
   {$sample:{size:parseInt(count)}}
 ])

 res.json(questions)

}

exports.submitTest = async (req, res) => {
  try {
    const { testTitle, score, totalQuestions, timeTaken } = req.body;
    
    const User = require("../models/User");
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const attempt = await TestAttempt.create({
      userId: user._id,
      userName: user.name,
      testTitle,
      score,
      totalQuestions,
      timeTaken
    });
    
    res.status(201).json({ success: true, attempt });
  } catch (error) {
    console.error("Error submitting test:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};