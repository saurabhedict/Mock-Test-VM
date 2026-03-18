const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("MONGO_URI is missing in .env file");
      process.exit(1);
    }
    
    // Set some options for better debugging
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s if can't connect
    });
    
    console.log("MongoDB Connected Successfully to:", mongoose.connection.host);
  } catch (err) {
    console.error("Database connection error details:", err.message);
    console.log("Retrying with local MongoDB if available...");
    try {
        await mongoose.connect("mongodb://localhost:27017/vidyarthi_mitra");
        console.log("Connected to Local MongoDB instead.");
    } catch (localErr) {
        console.error("Failed to connect to both Atlas and Local MongoDB.");
        process.exit(1);
    }
  }
};

module.exports = connectDB;
