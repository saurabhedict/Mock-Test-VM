const { setSharedCacheHeaders } = require("../utils/cacheHeaders");
const {
  PLAN_OR_CATALOG_CACHE_TTL_MS,
} = require("../services/testReadService");
const { getOrSetCachedValue } = require("../utils/inMemoryCache");
const { toIdString } = require("../utils/toIdString");
const Exam = require("../models/Exam");

const mapExam = (exam) => ({
  _id: toIdString(exam._id),
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
    setSharedCacheHeaders(res, { maxAgeSeconds: 300, staleWhileRevalidateSeconds: 3600 });

    const exams = await getOrSetCachedValue("exams:list", PLAN_OR_CATALOG_CACHE_TTL_MS, async () =>
      Exam.find({ isActive: true })
        .select("slug name shortName description icon durationMinutes totalQuestions totalMarks subjects isActive createdAt updatedAt")
        .sort({ createdAt: -1 })
        .lean()
    );

    res.json(exams.map(mapExam));
  } catch (error) {
    console.error("ListExams error:", error);
    res.status(500).json({ msg: "Server Error" });
  }
};

exports.getExamBySlug = async (req, res) => {
  try {
    setSharedCacheHeaders(res, { maxAgeSeconds: 300, staleWhileRevalidateSeconds: 3600 });

    const exam = await getOrSetCachedValue(`exam:public:${req.params.examId}`, PLAN_OR_CATALOG_CACHE_TTL_MS, async () =>
      Exam.findOne({ slug: req.params.examId, isActive: true })
        .select("slug name shortName description icon durationMinutes totalQuestions totalMarks subjects isActive createdAt updatedAt")
        .lean()
    );

    if (!exam) return res.status(404).json({ msg: "Exam not found" });
    res.json(mapExam(exam));
  } catch (error) {
    console.error("GetExamBySlug error:", error);
    res.status(500).json({ msg: "Server Error" });
  }
};
