const router = require('express').Router();
const upload = require('../middleware/uploadMiddleware');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Upload an image
// @route   POST /api/upload
// @access  Private/Admin
router.post('/', protect, admin, upload.single('image'), (req, res) => {
  console.log("Upload route hit by user:", req.user?.email);
  if (!req.file) {
    console.error("Upload failed: No file uploaded");
    return res.status(400).json({ msg: 'No file uploaded' });
  }
  console.log("Upload successful:", req.file.path);
  res.json({
    url: req.file.path,
    public_id: req.file.filename
  });
});

module.exports = router;
