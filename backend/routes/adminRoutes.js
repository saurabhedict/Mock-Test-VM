const router = require('express').Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { 
  getDashboardStats, 
  getAllTests, 
  createTest, 
  updateTest,
  deleteTest,
  getTestAttempts,
  getUsers,
  deleteUser,
  deleteUsersBulk,
  setUserRole,
  getAllExams,
  createExam,
  updateExam,
  deleteExam,
  deleteAttemptHistory,
} = require('../controllers/adminController');
const {
  createCoupon,
  listCoupons,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon,
} = require('../controllers/couponController');

router.use(protect);
router.use(admin);

router.get('/stats', getDashboardStats);
router.get('/users', getUsers);
router.delete('/users', deleteUsersBulk);
router.put('/users/:id/role', setUserRole);
router.delete('/users/:id', deleteUser);
router.get('/coupons', listCoupons);
router.post('/coupons', createCoupon);
router.put('/coupons/:id', updateCoupon);
router.patch('/coupons/:id/status', toggleCouponStatus);
router.delete('/coupons/:id', deleteCoupon);
router.get('/tests', getAllTests);
router.post('/tests', createTest);
router.put('/tests/:id', updateTest);
router.delete('/tests/:id', deleteTest);
router.get('/exams', getAllExams);
router.post('/exams', createExam);
router.put('/exams/:id', updateExam);
router.delete('/exams/:id', deleteExam);
router.get('/attempts', getTestAttempts);
router.delete('/attempts', deleteAttemptHistory);
router.delete('/attempts/:id/live', require('../controllers/adminController').terminateLiveAttempt);
router.put('/tests/:id/publish', require('../controllers/adminController').updateTestPublished);
router.get('/tests/:id/questions', require('../controllers/adminController').getTestQuestions);
router.post('/tests/:id/questions/batch', require('../controllers/adminController').saveBatchQuestions);
router.post('/tests/:id/questions', require('../controllers/adminController').saveQuestion);
router.delete('/tests/:id/questions/:questionId', require('../controllers/adminController').deleteQuestion);

module.exports = router;
