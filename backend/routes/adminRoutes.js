const router = require('express').Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { 
  getDashboardStats, 
  getAllTests, 
  createTest, 
  deleteTest,
  getTestAttempts 
} = require('../controllers/adminController');

router.use(protect);
router.use(admin);

router.get('/stats', getDashboardStats);
router.get('/tests', getAllTests);
router.post('/tests', createTest);
router.delete('/tests/:id', deleteTest);
router.get('/attempts', getTestAttempts);

module.exports = router;
