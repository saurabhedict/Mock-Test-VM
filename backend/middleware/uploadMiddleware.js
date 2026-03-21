const multer = require("multer");
const cloudinaryStorage = require("multer-storage-cloudinary");
const cloudinary = require("../utils/cloudinary");

const storage = cloudinaryStorage({
  cloudinary: cloudinary,
  folder: "vidyarthi-mitra/profiles",
  allowedFormats: ["jpg", "jpeg", "png"],
  filename: function (req, file, cb) {
    cb(undefined, `user_${req.user.id}_${Date.now()}`);
  }
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