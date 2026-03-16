const Question = require("../models/Question")

exports.startTest = async (req,res)=>{

 const {subject,count} = req.query

 const questions = await Question.aggregate([
   {$match:{subject}},
   {$sample:{size:parseInt(count)}}
 ])

 res.json(questions)

}