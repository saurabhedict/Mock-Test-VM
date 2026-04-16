const mongoose = require("mongoose");

const topicSchema = new mongoose.Schema(
  {
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, lowercase: true },
  },
  { timestamps: true }
);

topicSchema.index({ subjectId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model("Topic", topicSchema);
