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
      const defaultMaxPoolSize = process.env.VERCEL ? 10 : 20;
      const maxPoolSize = Math.max(1, Number(process.env.MONGO_MAX_POOL_SIZE || defaultMaxPoolSize));
      const minPoolSize = Math.max(0, Number(process.env.MONGO_MIN_POOL_SIZE || 0));

      globalMongoose.promise = mongoose.connect(mongoUri, {
        maxPoolSize,
        minPoolSize,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxIdleTimeMS: 30000,
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
