const Tesseract = require("tesseract.js");

const extractTextFromImage = async (fileBuffer) => {
  if (!fileBuffer) {
    const error = new Error("Image buffer is required for OCR");
    error.status = 400;
    throw error;
  }

  const result = await Tesseract.recognize(fileBuffer, "eng", {
    logger: () => {},
  });

  return result?.data?.text?.trim() || "";
};

module.exports = {
  extractTextFromImage,
};
