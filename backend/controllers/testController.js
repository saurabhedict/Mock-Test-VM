const TestModel = require("../models/Test");
const Question = require("../models/Question");
const Exam = require("../models/Exam");
const { normalizeWrittenAnswer } = require("../utils/plainText");

const isAnswered = (question, answer) => {
  if (question.questionType === "multiple") {
    return Array.isArray(answer) && answer.length > 0;
  }

  if (question.questionType === "written") {
    return typeof answer === "string" && answer.trim().length > 0;
  }

  return answer !== null && answer !== undefined && answer !== "";
};

const isCorrectAnswer = (question, answer) => {
  if (question.questionType === "multiple") {
    const selected = Array.isArray(answer) ? [...answer].map(Number).sort((a, b) => a - b) : [];
    const correct = [...(question.correctAnswers || [])].map(Number).sort((a, b) => a - b);
    return selected.length === correct.length && selected.every((value, index) => value === correct[index]);
  }

  if (question.questionType === "written") {
    return typeof answer === "string" && normalizeWrittenAnswer(answer) === normalizeWrittenAnswer(question.writtenAnswer || "");
  }

  return Number(answer) === Number(question.correctAnswer);
};

const getQuestionMarking = (question, exam) => {
  const subjectRule = exam?.subjects?.find((subject) => subject.name === question.subject);
  const positiveMarks =
    question.marksPerQuestion ??
    subjectRule?.marksPerQuestion ??
    1;
  const negativeMarks =
    question.negativeMarksPerQuestion ??
    subjectRule?.negativeMarksPerQuestion ??
    0;

  return {
    positiveMarks: Number(positiveMarks || 0),
    negativeMarks: Number(negativeMarks || 0),
  };
};

const calculateAttemptSummary = (questions, answers, exam) => {
  return questions.reduce(
    (summary, question, index) => {
      const answer = answers?.[index] ?? answers?.[String(index)] ?? null;
      const { positiveMarks, negativeMarks } = getQuestionMarking(question, exam);
      summary.totalMarks += positiveMarks;

      if (!isAnswered(question, answer)) {
        summary.unanswered += 1;
        return summary;
      }

      if (isCorrectAnswer(question, answer)) {
        summary.correct += 1;
        summary.score += positiveMarks;
        return summary;
      }

      summary.wrong += 1;
      summary.score -= negativeMarks;
      return summary;
    },
    { score: 0, correct: 0, wrong: 0, unanswered: 0, totalMarks: 0 }
  );
};

exports.getTestsByExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const tests = await TestModel.find({ exam: examId, isPublished: true })
      .select("title exam subject subjects durationMinutes totalMarks shuffleQuestions shuffleOptions questions isPublished createdAt")
      .sort({ createdAt: -1 })
      .lean();
    
    // Add question count
    const testsWithCount = tests.map(t => ({
      ...t,
      totalQuestions: Array.isArray(t.questions) ? t.questions.length : 0,
      subjects: t.subjects?.length ? t.subjects : [t.subject],
    }));

    res.json(testsWithCount);
  } catch (error) {
    res.status(500).json({ msg: "Server Error" });
  }
};

exports.getTestById = async (req, res) => {
  try {
    const test = await TestModel.findById(req.params.id)
      .select("title exam subject subjects durationMinutes totalMarks shuffleQuestions shuffleOptions questions")
      .populate({
        path: "questions",
        select:
          "question questionType questionImage options correctAnswer correctAnswers writtenAnswer subject explanation explanationImage marksPerQuestion negativeMarksPerQuestion multipleCorrectScoringMode",
      })
      .lean();

    if (!test) return res.status(404).json({ msg: "Test not found" });

    const exam = await Exam.findOne({ slug: test.exam })
      .select("slug name shortName durationMinutes totalQuestions totalMarks subjects")
      .lean();

    res.json({
      ...test,
      subjects: test.subjects?.length ? test.subjects : [test.subject],
      examDetails: exam
        ? {
            examId: exam.slug,
            examName: exam.name,
            shortName: exam.shortName,
            durationMinutes: exam.durationMinutes,
            totalQuestions: exam.totalQuestions,
            totalMarks: exam.totalMarks,
            subjects: exam.subjects,
          }
        : null,
    });
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
