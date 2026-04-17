const router = require("express").Router();
const { protect, admin } = require("../middleware/authMiddleware");
const aiController = require("../controllers/aiController");

router.post("/analyze-test", protect, aiController.analyzeTest);
router.post("/chat", protect, aiController.chat);
router.get("/chat/status", protect, aiController.getChatStatus);
router.get("/chat/sessions", protect, aiController.listChatSessions);
router.get("/chat/sessions/:sessionId", protect, aiController.getChatSession);
router.delete("/chat/sessions", protect, aiController.deleteChatSessions);
router.post(
  "/upload-questions-image",
  protect,
  admin,
  aiController.uploadQuestionsImageMiddleware,
  aiController.uploadQuestionsImage
);
router.get("/analytics/:studentId", protect, aiController.getAnalytics);
router.post("/recommendations", protect, aiController.getRecommendations);
router.post("/generate-questions", protect, admin, aiController.generateQuestions);
router.post("/predict-performance", protect, aiController.predictPerformance);

module.exports = router;
