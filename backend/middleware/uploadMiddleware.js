const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../utils/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "vidyarthi-mitra",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    resource_type: "image",
    public_id: (req) => {
      const userId = req.user?._id || req.user?.id || 'anonymous';
      return `img_${userId}_${Date.now()}`;
    },
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

module.exports = upload;
