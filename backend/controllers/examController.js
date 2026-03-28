const Exam = require("../models/Exam");

const mapExam = (exam) => ({
  _id: exam._id,
  examId: exam.slug,
  slug: exam.slug,
  examName: exam.name,
  name: exam.name,
  shortName: exam.shortName,
  description: exam.description,
  icon: exam.icon,
  durationMinutes: exam.durationMinutes,
  totalQuestions: exam.totalQuestions,
  totalMarks: exam.totalMarks,
  subjects: exam.subjects || [],
  isActive: exam.isActive,
  createdAt: exam.createdAt,
  updatedAt: exam.updatedAt,
});

exports.listExams = async (req, res) => {
  try {
    const exams = await Exam.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(exams.map(mapExam));
  } catch (error) {
    console.error("ListExams error:", error);
    res.status(500).json({ msg: "Server Error" });
  }
};

exports.getExamBySlug = async (req, res) => {
  try {
    const exam = await Exam.findOne({ slug: req.params.examId, isActive: true });
    if (!exam) return res.status(404).json({ msg: "Exam not found" });
    res.json(mapExam(exam));
  } catch (error) {
    console.error("GetExamBySlug error:", error);
    res.status(500).json({ msg: "Server Error" });
  }
};
