const mongoose = require("mongoose");
const Test = require("../models/Test");
const Question = require("../models/Question");
const TestSchema = require("../models/TestSchema");
const TestQuestionMapping = require("../models/TestQuestionMapping");
const StudentHistory = require("../models/StudentHistory");
const TestAttempt = require("../models/TestAttempt");
const { generateQuestionSet } = require("../services/dynamicQuestionSetService");
const { getSession, setSession, deleteSession } = require("../utils/redisClient");

const SESSION_TTL_SECONDS = 60 * 60 * 4;

const toObjectId = (value) => (mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null);

const toPlainSchema = (schemaDoc) => {
  const subjects = {};
  const subjectEntries = schemaDoc?.subjects instanceof Map
    ? Array.from(schemaDoc.subjects.entries())
    : Object.entries(schemaDoc?.subjects || {});

  for (const [subject, rule] of subjectEntries) {
    const topicMap = rule?.topics instanceof Map ? Object.fromEntries(rule.topics.entries()) : (rule?.topics || {});
    subjects[String(subject)] = {
      totalQuestions: Number(rule?.totalQuestions || 0),
      topics: Object.fromEntries(
        Object.entries(topicMap).map(([topic, count]) => [String(topic), Number(count || 0)])
      ),
    };
  }

  return subjects;
};

const buildSessionKey = (studentId, testId) => `test:${studentId}:${testId}`;

const getWeakTopicsFromHistory = (history) => {
  const entries = history?.topicStats instanceof Map
    ? Array.from(history.topicStats.entries())
    : Object.entries(history?.topicStats || {});

  return entries
    .map(([topic, stat]) => ({
      topic: String(topic),
      accuracy: Number(stat?.attempted ? stat.correct / stat.attempted : 1),
    }))
    .sort((left, right) => left.accuracy - right.accuracy)
    .slice(0, 3)
    .map((item) => item.topic);
};

const normalizeOptions = (options = []) =>
  options.map((option, index) => ({
    optionId: String(option.optionId || `opt_${index + 1}`),
    text: String(option.text || ""),
    imageUrl: option.imageUrl ? String(option.imageUrl) : "",
  }));

const sanitizeQuestionForStudent = (question) => ({
  id: String(question._id),
  subject: question.subject || "",
  topic: question.topic || "",
  difficulty: question.difficulty || "medium",
  questionHTML: question.questionHTML || question.question || "",
  image: question.image || question.questionImage || "",
  options: Array.isArray(question.options) ? question.options.map((option) => ({
    optionId: String(option.optionId || ""),
    text: option.text || "",
    imageUrl: option.imageUrl || "",
  })) : [],
  marks: Number(question.marks ?? question.marksPerQuestion ?? 1),
  negativeMarks: Number(question.negativeMarks ?? question.negativeMarksPerQuestion ?? 0),
});

const parseSchemaPayload = (body = {}) => {
  const rawSubjects = body.subjects && typeof body.subjects === "object" ? body.subjects : {};
  const subjects = {};
  let totalQuestions = 0;

  for (const [subject, rule] of Object.entries(rawSubjects)) {
    const total = Number(rule?.totalQuestions || rule?.total || 0);
    const topics = rule?.topics && typeof rule.topics === "object" ? rule.topics : {};
    const normalizedTopics = Object.fromEntries(
      Object.entries(topics).map(([topic, count]) => [String(topic), Number(count || 0)])
    );
    const weightedSum = Object.values(normalizedTopics).reduce((sum, count) => sum + Number(count || 0), 0);

    if (weightedSum > total) {
      const error = new Error(`Topic weights exceed total questions for subject '${subject}'`);
      error.status = 400;
      throw error;
    }

    subjects[String(subject)] = {
      totalQuestions: total,
      topics: normalizedTopics,
    };
    totalQuestions += total;
  }

  if (!Object.keys(subjects).length) {
    const error = new Error("At least one subject schema is required");
    error.status = 400;
    throw error;
  }

  return { subjects, totalQuestions };
};

exports.createTestSchema = async (req, res) => {
  try {
    const testId = toObjectId(req.body.testId);
    if (!testId) {
      return res.status(400).json({ success: false, message: "Valid testId is required" });
    }

    const test = await Test.findById(testId).select("_id");
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    const parsed = parseSchemaPayload(req.body);
    const schema = await TestSchema.findOneAndUpdate(
      { testId },
      { $set: { subjects: parsed.subjects, totalQuestions: parsed.totalQuestions } },
      { new: true, upsert: true }
    );

    res.status(201).json({
      success: true,
      schema: {
        testId: String(schema.testId),
        subjects: toPlainSchema(schema),
        totalQuestions: schema.totalQuestions,
      },
    });
  } catch (error) {
    console.error("Create test schema error:", error);
    res.status(error.status || 500).json({ success: false, message: error.message || "Server Error" });
  }
};

exports.addQuestion = async (req, res) => {
  try {
    const testId = toObjectId(req.body.testId);
    if (!testId) {
      return res.status(400).json({ success: false, message: "Valid testId is required" });
    }

    const schema = await TestSchema.findOne({ testId });
    if (!schema) {
      return res.status(400).json({ success: false, message: "Create test schema before adding questions" });
    }

    const subject = String(req.body.subject || "").trim();
    const topic = String(req.body.topic || "").trim();
    const schemaSubjects = toPlainSchema(schema);

    if (!schemaSubjects[subject]) {
      return res.status(400).json({ success: false, message: "Subject is not part of this test schema" });
    }

    const allowedTopics = schemaSubjects[subject].topics || {};
    if (Object.keys(allowedTopics).length && !Object.prototype.hasOwnProperty.call(allowedTopics, topic)) {
      return res.status(400).json({ success: false, message: "Topic is not allowed for this subject in schema" });
    }

    const options = normalizeOptions(Array.isArray(req.body.options) ? req.body.options : []);
    const correctOptionId = String(req.body.correctOptionId || "");
    const hasMatchingOption = options.some((option) => option.optionId === correctOptionId);
    if (!hasMatchingOption) {
      return res.status(400).json({ success: false, message: "correctOptionId must match one of the options" });
    }

    const question = await Question.create({
      exam: req.body.exam || "",
      subject,
      topic,
      difficulty: String(req.body.difficulty || "medium").toLowerCase(),
      questionHTML: req.body.questionHTML || "",
      question: req.body.questionHTML || "",
      image: req.body.image || "",
      questionImage: req.body.image || "",
      options,
      correctOptionId,
      explanationHTML: req.body.explanationHTML || "",
      explanation: req.body.explanationHTML || "",
      marks: Number(req.body.marks ?? 1),
      negativeMarks: Number(req.body.negativeMarks ?? 0),
      marksPerQuestion: Number(req.body.marks ?? 1),
      negativeMarksPerQuestion: Number(req.body.negativeMarks ?? 0),
      questionType: "single",
      correctAnswer: Math.max(options.findIndex((option) => option.optionId === correctOptionId), 0),
      correctAnswers: [Math.max(options.findIndex((option) => option.optionId === correctOptionId), 0)],
    });

    await TestQuestionMapping.updateOne(
      { testId, questionId: question._id },
      { $setOnInsert: { testId, questionId: question._id } },
      { upsert: true }
    );

    res.status(201).json({
      success: true,
      question: {
        id: String(question._id),
        subject: question.subject,
        topic: question.topic,
        difficulty: question.difficulty,
      },
    });
  } catch (error) {
    console.error("Add question error:", error);
    res.status(error.status || 500).json({ success: false, message: error.message || "Server Error" });
  }
};

exports.startTest = async (req, res) => {
  try {
    const testId = toObjectId(req.body.testId);
    if (!testId) {
      return res.status(400).json({ success: false, message: "Valid testId is required" });
    }

    const [test, schema, mappings] = await Promise.all([
      Test.findById(testId).select("_id title exam"),
      TestSchema.findOne({ testId }),
      TestQuestionMapping.find({ testId }).select("questionId").lean(),
    ]);

    if (!test) return res.status(404).json({ success: false, message: "Test not found" });
    if (!schema) return res.status(400).json({ success: false, message: "Test schema not configured" });
    if (!mappings.length) return res.status(400).json({ success: false, message: "Question pool is empty for this test" });

    const questionIds = mappings.map((item) => item.questionId);
    const pool = await Question.find({ _id: { $in: questionIds } })
      .select("_id subject topic difficulty questionHTML question image options marks negativeMarks")
      .lean();

    let history = await StudentHistory.findOne({ userId: req.user._id, testId }).lean();
    const attemptedIds = new Set((history?.attemptedQuestionIds || []).map((id) => String(id)));
    const poolIds = new Set(pool.map((question) => String(question._id)));
    const exhausted = poolIds.size > 0 && [...poolIds].every((id) => attemptedIds.has(id));

    if (exhausted) {
      await StudentHistory.updateOne(
        { userId: req.user._id, testId },
        { $set: { attemptedQuestionIds: [] } },
        { upsert: true }
      );
      history = await StudentHistory.findOne({ userId: req.user._id, testId }).lean();
    }

    const selected = generateQuestionSet({
      pool,
      schema: toPlainSchema(schema),
      studentHistory: history || {},
      analytics: { weakTopics: getWeakTopicsFromHistory(history) },
    });

    if (!selected.length) {
      return res.status(400).json({ success: false, message: "Insufficient questions to generate test" });
    }

    const attempt = await TestAttempt.create({
      userId: req.user._id,
      testId: String(testId),
      examId: String(test.exam || ""),
      testTitle: test.title || "Dynamic Test",
      status: "IN_PROGRESS",
      totalQuestions: selected.length,
      totalMarks: selected.reduce((sum, question) => sum + Number(question.marks ?? 1), 0),
      startedAt: new Date(),
      lastActivityAt: new Date(),
    });

    const sessionPayload = {
      testId: String(testId),
      attemptId: String(attempt._id),
      questionIds: selected.map((question) => String(question._id)),
      answers: {},
      currentIndex: 0,
      startedAt: new Date().toISOString(),
    };

    const sessionKey = buildSessionKey(String(req.user._id), String(testId));
    await setSession(sessionKey, sessionPayload, SESSION_TTL_SECONDS);

    const firstBatch = selected.slice(0, 15).map(sanitizeQuestionForStudent);
    res.status(201).json({
      success: true,
      statusText: "Preparing your test...",
      sessionKey,
      testId: String(testId),
      attemptId: String(attempt._id),
      questionIds: sessionPayload.questionIds,
      firstBatch,
      batchSize: 15,
    });
  } catch (error) {
    console.error("Start dynamic test error:", error);
    res.status(error.status || 500).json({ success: false, message: error.message || "Server Error" });
  }
};

exports.fetchQuestionsBatch = async (req, res) => {
  try {
    const testId = String(req.query.testId || "");
    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(400).json({ success: false, message: "Valid testId is required" });
    }

    const offset = Math.max(0, Number(req.query.offset || 0));
    const limit = Math.max(1, Math.min(20, Number(req.query.limit || 10)));
    const sessionKey = buildSessionKey(String(req.user._id), testId);
    const session = await getSession(sessionKey);

    if (!session) {
      return res.status(404).json({ success: false, message: "Active test session not found" });
    }

    const batchIds = session.questionIds.slice(offset, offset + limit);
    const questions = await Question.find({ _id: { $in: batchIds } })
      .select("_id subject topic difficulty questionHTML question image options marks negativeMarks")
      .lean();
    const questionMap = new Map(questions.map((question) => [String(question._id), question]));
    const ordered = batchIds.map((id) => questionMap.get(String(id))).filter(Boolean).map(sanitizeQuestionForStudent);

    res.json({
      success: true,
      questions: ordered,
      offset,
      limit,
      total: session.questionIds.length,
      hasMore: offset + limit < session.questionIds.length,
      nextOffset: offset + ordered.length,
    });
  } catch (error) {
    console.error("Fetch questions batch error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.saveAnswer = async (req, res) => {
  try {
    const testId = String(req.body.testId || "");
    const questionId = String(req.body.questionId || "");
    if (!mongoose.Types.ObjectId.isValid(testId) || !mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ success: false, message: "Valid testId and questionId are required" });
    }

    const sessionKey = buildSessionKey(String(req.user._id), testId);
    const session = await getSession(sessionKey);
    if (!session) {
      return res.status(404).json({ success: false, message: "Active test session not found" });
    }

    if (!session.questionIds.includes(questionId)) {
      return res.status(400).json({ success: false, message: "Question does not belong to this active test session" });
    }

    session.answers[questionId] = {
      value: req.body.answer ?? null,
      timeSpentSeconds: Number(req.body.timeSpentSeconds || 0),
      savedAt: new Date().toISOString(),
    };
    if (req.body.currentIndex !== undefined) {
      session.currentIndex = Math.max(0, Number(req.body.currentIndex || 0));
    }
    await setSession(sessionKey, session, SESSION_TTL_SECONDS);

    await TestAttempt.updateOne(
      { _id: session.attemptId, userId: req.user._id, status: "IN_PROGRESS" },
      { $set: { lastActivityAt: new Date() } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Save answer error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const evaluateAnswer = (question, answerPayload) => {
  const marks = Number(question.marks ?? question.marksPerQuestion ?? 1);
  const negativeMarks = Number(question.negativeMarks ?? question.negativeMarksPerQuestion ?? 0);
  const answer = answerPayload?.value;
  const selectedOptionId = String(answer ?? "");
  const isAnswered = selectedOptionId.length > 0;
  const isCorrect = isAnswered && selectedOptionId === String(question.correctOptionId || "");

  if (!isAnswered) {
    return { verdict: "unanswered", score: 0, marks, negativeMarks };
  }

  if (isCorrect) {
    return { verdict: "correct", score: marks, marks, negativeMarks };
  }

  return { verdict: "wrong", score: -negativeMarks, marks, negativeMarks };
};

exports.submitTest = async (req, res) => {
  try {
    const testId = String(req.body.testId || "");
    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(400).json({ success: false, message: "Valid testId is required" });
    }

    const sessionKey = buildSessionKey(String(req.user._id), testId);
    const session = await getSession(sessionKey);
    if (!session) {
      return res.status(404).json({ success: false, message: "Active test session not found" });
    }

    const questions = await Question.find({ _id: { $in: session.questionIds } })
      .select("_id subject topic difficulty questionHTML question explanationHTML explanation options correctOptionId marks negativeMarks")
      .lean();
    const questionMap = new Map(questions.map((question) => [String(question._id), question]));
    const orderedQuestions = session.questionIds.map((id) => questionMap.get(String(id))).filter(Boolean);

    let score = 0;
    let totalMarks = 0;
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;
    const snapshots = [];
    const topicAccumulator = {};
    const difficultyAccumulator = {};

    for (let index = 0; index < orderedQuestions.length; index += 1) {
      const question = orderedQuestions[index];
      const qid = String(question._id);
      const answerPayload = session.answers[qid] || null;
      const result = evaluateAnswer(question, answerPayload);
      score += result.score;
      totalMarks += result.marks;
      if (result.verdict === "correct") correct += 1;
      if (result.verdict === "wrong") wrong += 1;
      if (result.verdict === "unanswered") unanswered += 1;

      const topic = String(question.topic || "Unspecified");
      if (!topicAccumulator[topic]) {
        topicAccumulator[topic] = { attempted: 0, correct: 0, totalTime: 0 };
      }
      const difficulty = String(question.difficulty || "medium");
      if (!difficultyAccumulator[difficulty]) {
        difficultyAccumulator[difficulty] = { total: 0, correct: 0, wrong: 0, unanswered: 0 };
      }
      if (result.verdict !== "unanswered") {
        topicAccumulator[topic].attempted += 1;
      }
      if (result.verdict === "correct") {
        topicAccumulator[topic].correct += 1;
      }
      topicAccumulator[topic].totalTime += Number(answerPayload?.timeSpentSeconds || 0);
      difficultyAccumulator[difficulty].total += 1;
      difficultyAccumulator[difficulty][result.verdict] += 1;

      snapshots.push({
        questionId: qid,
        order: index + 1,
        subject: question.subject || "",
        topic,
        difficulty: question.difficulty || "medium",
        question: question.questionHTML || question.question || "",
        options: question.options || [],
        studentAnswer: answerPayload?.value ?? null,
        correctAnswer: question.correctOptionId || "",
        explanation: question.explanationHTML || question.explanation || "",
        marks: result.marks,
        negativeMarks: result.negativeMarks,
        verdict: result.verdict,
        score: result.score,
        timeSpentSeconds: Number(answerPayload?.timeSpentSeconds || 0),
      });
    }

    const attempted = correct + wrong;
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 10000) / 100 : 0;
    const startedAt = new Date(session.startedAt || Date.now());
    const timeTakenSeconds = Number(
      req.body.timeTakenSeconds || Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000))
    );

    const topicStatsUpdate = {};
    const topicBreakdown = [];
    for (const [topic, stat] of Object.entries(topicAccumulator)) {
      const averageTimeSeconds = stat.attempted > 0 ? stat.totalTime / stat.attempted : 0;
      topicStatsUpdate[topic] = {
        attempted: stat.attempted,
        correct: stat.correct,
        averageTimeSeconds: Math.round(averageTimeSeconds * 100) / 100,
      };
      topicBreakdown.push({
        topic,
        total: stat.attempted,
        correct: stat.correct,
        wrong: Math.max(0, stat.attempted - stat.correct),
        unanswered: 0,
        averageTimeSeconds: Math.round(averageTimeSeconds * 100) / 100,
      });
    }
    const difficultyBreakdown = Object.entries(difficultyAccumulator).map(([difficulty, stat]) => ({
      difficulty,
      total: stat.total,
      correct: stat.correct,
      wrong: stat.wrong,
      unanswered: stat.unanswered,
    }));

    await TestAttempt.updateOne(
      { _id: session.attemptId, userId: req.user._id, status: "IN_PROGRESS" },
      {
        $set: {
          status: "COMPLETED",
          score,
          totalQuestions: orderedQuestions.length,
          totalMarks,
          accuracy,
          answersSubmitted: Object.fromEntries(
            Object.entries(session.answers).map(([qid, payload]) => [qid, payload.value])
          ),
          timeTakenSeconds,
          questionSnapshots: snapshots,
          topicBreakdown,
          difficultyBreakdown,
          completedAt: new Date(),
          lastActivityAt: new Date(),
        },
      }
    );

    const history = await StudentHistory.findOne({ userId: req.user._id, testId });
    const oldAttempted = (history?.attemptedQuestionIds || []).map((id) => String(id));
    const mergedAttempted = [...new Set([...oldAttempted, ...session.questionIds])];
    const existingTopicStats = history?.topicStats instanceof Map
      ? Object.fromEntries(history.topicStats.entries())
      : (history?.topicStats || {});

    const nextTopicStats = { ...existingTopicStats };
    for (const [topic, stat] of Object.entries(topicStatsUpdate)) {
      const previous = nextTopicStats[topic] || { attempted: 0, correct: 0, averageTimeSeconds: 0 };
      const combinedAttempted = Number(previous.attempted || 0) + Number(stat.attempted || 0);
      const combinedCorrect = Number(previous.correct || 0) + Number(stat.correct || 0);
      const weightedAverageTime =
        combinedAttempted > 0
          ? (
              (Number(previous.averageTimeSeconds || 0) * Number(previous.attempted || 0) +
                Number(stat.averageTimeSeconds || 0) * Number(stat.attempted || 0)) /
              combinedAttempted
            )
          : 0;

      nextTopicStats[topic] = {
        attempted: combinedAttempted,
        correct: combinedCorrect,
        averageTimeSeconds: Math.round(weightedAverageTime * 100) / 100,
      };
    }

    await StudentHistory.updateOne(
      { userId: req.user._id, testId },
      {
        $set: {
          attemptedQuestionIds: mergedAttempted,
          topicStats: nextTopicStats,
        },
      },
      { upsert: true }
    );

    await deleteSession(sessionKey);

    res.json({
      success: true,
      summary: {
        score,
        totalMarks,
        correct,
        wrong,
        unanswered,
        accuracy,
        totalQuestions: orderedQuestions.length,
        timeTakenSeconds,
      },
    });
  } catch (error) {
    console.error("Submit dynamic test error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
