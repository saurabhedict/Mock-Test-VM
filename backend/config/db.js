const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI is missing in .env file");
    }
    
    await mongoose.connect(mongoUri);
  } catch (err) {
    throw new Error("Database connection error: " + err.message);
  }
};

module.exports = connectDB;
