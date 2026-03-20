const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("MONGO_URI is missing in .env file");
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log("MongoDB Connected Successfully to Atlas:", mongoose.connection.host);
  } catch (err) {
    console.error("Database connection error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
