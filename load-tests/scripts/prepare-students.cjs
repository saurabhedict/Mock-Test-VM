const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

const rootDir = path.resolve(__dirname, "..", "..");
const backendEnvPath = path.join(rootDir, "backend", ".env");

dotenv.config({ path: backendEnvPath });

const mongoose = require(path.join(rootDir, "backend", "node_modules", "mongoose"));
const User = require(path.join(rootDir, "backend", "models", "User"));
const Test = require(path.join(rootDir, "backend", "models", "Test"));
const TestAttempt = require(path.join(rootDir, "backend", "models", "TestAttempt"));

const DEFAULT_USER_COUNT = 2600;
const DEFAULT_CAMPAIGN = "vmbench";
const DEFAULT_PASSWORD = "VmBench2026!Load";
const DEFAULT_OUTPUT_PATH = path.join(rootDir, "load-tests", "artillery", "students.csv");
const DEFAULT_META_PATH = path.join(rootDir, "load-tests", "artillery", "benchmark-meta.json");

const parsePositiveInteger = (value, fallbackValue) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackValue;
};

const ensureDirectory = (filePath) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

const buildEmail = (campaign, index) =>
  `loadtest.${campaign}.${String(index).padStart(4, "0")}@example.com`;

const connectDb = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing from backend/.env");
  }

  if (mongoose.connection.readyState === 1) {
    return;
  }

  await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 10,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    maxIdleTimeMS: 30000,
  });
};

const writeCsv = (outputPath, rows) => {
  ensureDirectory(outputPath);
  const csv = ["email,password", ...rows.map((row) => `${row.email},${row.password}`)].join("\n");
  fs.writeFileSync(outputPath, `${csv}\n`, "utf8");
};

const writeMeta = (metaPath, payload) => {
  ensureDirectory(metaPath);
  fs.writeFileSync(metaPath, JSON.stringify(payload, null, 2), "utf8");
};

async function main() {
  const campaign = String(process.env.LOAD_TEST_CAMPAIGN || DEFAULT_CAMPAIGN)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || DEFAULT_CAMPAIGN;
  const userCount = parsePositiveInteger(process.env.LOAD_TEST_USER_COUNT, DEFAULT_USER_COUNT);
  const outputPath = process.env.LOAD_TEST_OUTPUT_PATH
    ? path.resolve(rootDir, process.env.LOAD_TEST_OUTPUT_PATH)
    : DEFAULT_OUTPUT_PATH;
  const metaPath = process.env.LOAD_TEST_META_PATH
    ? path.resolve(rootDir, process.env.LOAD_TEST_META_PATH)
    : DEFAULT_META_PATH;
  const sharedPassword = String(process.env.LOAD_TEST_SHARED_PASSWORD || DEFAULT_PASSWORD);

  await connectDb();

  const publishedTest = await Test.findOne({ isPublished: true })
    .select("_id exam title")
    .sort({ createdAt: -1 })
    .lean();

  if (!publishedTest) {
    throw new Error("No published test was found. Publish at least one test before running the benchmark.");
  }

  const sharedHash = await bcrypt.hash(sharedPassword, 12);
  const studentRows = [];
  const bulkOperations = [];

  for (let index = 1; index <= userCount; index += 1) {
    const email = buildEmail(campaign, index);

    studentRows.push({
      email,
      password: sharedPassword,
    });

    bulkOperations.push({
      updateOne: {
        filter: { email },
        update: {
          $set: {
            name: `Load Test Student ${String(index).padStart(4, "0")}`,
            email,
            password: sharedHash,
            isVerified: true,
            role: "student",
            phone: "",
            examPref: publishedTest.exam || "",
            refreshToken: "",
            sessionVersion: 0,
            profileCompleted: false,
          },
        },
        upsert: true,
      },
    });
  }

  if (bulkOperations.length > 0) {
    await User.bulkWrite(bulkOperations, { ordered: false });
  }

  const emails = studentRows.map((row) => row.email);
  const users = await User.find({ email: { $in: emails } }).select("_id email").lean();
  const userIds = users.map((user) => user._id);

  if (userIds.length > 0) {
    await TestAttempt.deleteMany({ userId: { $in: userIds } });
  }

  writeCsv(outputPath, studentRows);
  writeMeta(metaPath, {
    generatedAt: new Date().toISOString(),
    campaign,
    userCount,
    outputPath,
    publishedTest: {
      testId: String(publishedTest._id),
      examId: publishedTest.exam || "",
      title: publishedTest.title || "",
    },
  });

  console.log(
    JSON.stringify(
      {
        success: true,
        campaign,
        userCount,
        outputPath,
        metaPath,
        examId: publishedTest.exam || "",
        testId: String(publishedTest._id),
        testTitle: publishedTest.title || "",
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
