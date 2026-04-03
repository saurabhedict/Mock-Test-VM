const mongoose = require("mongoose");

const globalMongoose = global.__vidyarthiMitraMongoose || {
  connection: null,
  promise: null,
};

global.__vidyarthiMitraMongoose = globalMongoose;

const connectDB = async () => {
  try {
    if (globalMongoose.connection || mongoose.connection.readyState === 1) {
      globalMongoose.connection = mongoose.connection;
      return globalMongoose.connection;
    }

    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI is missing in .env file");
    }

    if (!globalMongoose.promise) {
      globalMongoose.promise = mongoose.connect(mongoUri, {
        maxPoolSize: 20,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
    }

    globalMongoose.connection = await globalMongoose.promise;
    return globalMongoose.connection;
  } catch (err) {
    globalMongoose.promise = null;
    throw new Error("Database connection error: " + err.message);
  }
};

module.exports = connectDB;
