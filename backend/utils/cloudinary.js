<<<<<<< HEAD
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
=======
const cloudinary = require("cloudinary").v2;
>>>>>>> origin/saurabh-with-milin

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

<<<<<<< HEAD
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'mock-test-questions',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

const upload = multer({ storage: storage });

module.exports = { cloudinary, upload };
=======
module.exports = cloudinary;
>>>>>>> origin/saurabh-with-milin
