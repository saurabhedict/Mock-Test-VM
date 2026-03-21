const router = require("express").Router();
const { startTest, submitTest } = require("../controllers/testController");
const { protect } = require("../middleware/authMiddleware");

router.get("/start", startTest);
router.post("/submit", protect, submitTest);

module.exports = router;