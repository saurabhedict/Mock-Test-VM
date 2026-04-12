const mongoose = require('mongoose');
const Test = require('./backend/models/Test');
const Question = require('./backend/models/Question');

async function main() {
  await mongoose.connect('mongodb+srv://vidyarthimitra:vidyarthimitra101@vidyartimitra01.1hksdbs.mongodb.net/mockprep?retryWrites=true&w=majority&appName=vidyartimitra01');
  const test = await Test.findOne({ title: /MHTCET/i });
  if (!test) { console.log('no test'); process.exit(1); }
  console.log('Test EXAM field:', test.exam, 'Test subjects:', test.subjects);
  const questions = await Question.find({ _id: { $in: test.questions } }).limit(2).lean();
  console.log('Questions:', JSON.stringify(questions, null, 2));
  process.exit(0);
}
main().catch(console.error);
