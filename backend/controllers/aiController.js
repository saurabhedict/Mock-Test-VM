const multer = require("multer");
const {
  analyzeTest,
  chatWithAssistant,
  deleteChatSessions,
  listChatSessions,
  getChatSession,
  parseQuestionsFromExtractedText,
  getStudentAnalytics,
  getRecommendations,
  generateQuestions,
  predictStudentPerformance,
} = require("../services/aiEducationService");
const { extractTextFromImage } = require("../services/ocrService");

const ocrUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    if (file.mimetype?.startsWith("image/")) {
      callback(null, true);
      return;
    }
    callback(new Error("Only image files are allowed"));
  },
});

const ensureStudentScope = (req, studentId) => {
  if (req.user.role === "admin") return;
  if (String(req.user._id) !== String(studentId)) {
    const error = new Error("Not authorized to access this student's analytics");
    error.status = 403;
    throw error;
  }
};

const handleError = (res, error) => {
  console.error("AI controller error:", error);
  res.status(error.status || 500).json({
    success: false,
    message: error.message || "AI request failed",
  });
};

exports.uploadQuestionsImageMiddleware = ocrUpload.single("image");

exports.analyzeTest = async (req, res) => {
  try {
    const analysis = await analyzeTest(req.body);
    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    handleError(res, error);
  }
};

exports.chat = async (req, res) => {
  try {
    const data = await chatWithAssistant({
      userId: req.user._id,
      sessionId: req.body.sessionId,
      message: req.body.message,
      context: {
        ...(req.body.context || {}),
        attachments: Array.isArray(req.body.attachments) ? req.body.attachments : [],
      },
      memory: req.body.memory !== false,
    });
    res.json({
      success: true,
      ...data,
    });
  } catch (error) {
    handleError(res, error);
  }
};

exports.listChatSessions = async (req, res) => {
  try {
    const sessions = await listChatSessions({ userId: req.user._id });
    res.json({
      success: true,
      sessions,
    });
  } catch (error) {
    handleError(res, error);
  }
};

exports.getChatSession = async (req, res) => {
  try {
    const session = await getChatSession({
      userId: req.user._id,
      sessionId: req.params.sessionId,
    });
    res.json({
      success: true,
      session,
    });
  } catch (error) {
    handleError(res, error);
  }
};

exports.deleteChatSessions = async (req, res) => {
  try {
    const result = await deleteChatSessions({
      userId: req.user._id,
      sessionIds: req.body?.sessionIds,
    });

    res.json({
      success: true,
      deletedCount: result.deletedCount || 0,
    });
  } catch (error) {
    handleError(res, error);
  }
};

exports.uploadQuestionsImage = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: "Image file is required",
      });
    }

    const extractedText = await extractTextFromImage(req.file.buffer);
    const questions = await parseQuestionsFromExtractedText({ extractedText });
    res.json({
      success: true,
      extractedText,
      questions,
    });
  } catch (error) {
    handleError(res, error);
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    ensureStudentScope(req, req.params.studentId);
    const analytics = await getStudentAnalytics({ studentId: req.params.studentId });
    res.json({
      success: true,
      analytics,
    });
  } catch (error) {
    handleError(res, error);
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const studentId = req.body.studentId || req.user._id;
    ensureStudentScope(req, studentId);
    const recommendations = await getRecommendations({ studentId });
    res.json({
      success: true,
      recommendations,
    });
  } catch (error) {
    handleError(res, error);
  }
};

exports.generateQuestions = async (req, res) => {
  try {
    const questions = await generateQuestions({
      topic: req.body.topic,
      difficulty: req.body.difficulty,
      numberOfQuestions: req.body.numberOfQuestions || req.body.count,
    });
    res.json({
      success: true,
      questions,
    });
  } catch (error) {
    handleError(res, error);
  }
};

exports.predictPerformance = async (req, res) => {
  try {
    const studentId = req.body.studentId || req.user._id;
    ensureStudentScope(req, studentId);
    const prediction = await predictStudentPerformance({ studentId });
    res.json({
      success: true,
      prediction,
    });
  } catch (error) {
    handleError(res, error);
  }
};
