const { calculateAttemptSummary, buildAttemptQuestionSnapshots, roundScore } = require("./scoringService");
const { truncateText } = require("../utils/plainText");

const toPercentage = (numerator, denominator) => {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
};

const buildGroupedPerformance = (snapshots = [], keySelector, labelKey) =>
  Object.values(
    snapshots.reduce((accumulator, snapshot) => {
      const key = keySelector(snapshot) || "Unspecified";

      if (!accumulator[key]) {
        accumulator[key] = {
          [labelKey]: key,
          total: 0,
          attempted: 0,
          correct: 0,
          partial: 0,
          wrong: 0,
          unanswered: 0,
          averageScore: 0,
          totalScore: 0,
          averageTimeSeconds: 0,
          totalTimeSeconds: 0,
          accuracy: 0,
        };
      }

      const bucket = accumulator[key];
      bucket.total += 1;
      bucket.totalScore += Number(snapshot.score || 0);
      bucket.totalTimeSeconds += Number(snapshot.timeSpentSeconds || 0);
      bucket.averageScore = roundScore(bucket.totalScore / Math.max(bucket.total, 1));

      if (snapshot.verdict === "unanswered") {
        bucket.unanswered += 1;
      } else {
        bucket.attempted += 1;
        bucket[snapshot.verdict] = (bucket[snapshot.verdict] || 0) + 1;
      }

      bucket.averageTimeSeconds = roundScore(bucket.totalTimeSeconds / Math.max(bucket.total, 1));
      bucket.accuracy = toPercentage(
        bucket.correct + bucket.partial * 0.5,
        Math.max(bucket.attempted, 1)
      );
      return accumulator;
    }, {})
  ).sort((left, right) => right.accuracy - left.accuracy || right.correct - left.correct);

const buildTimeAnalysis = (snapshots = [], totalTimeSeconds = 0) => {
  const timedSnapshots = snapshots.filter((snapshot) => Number(snapshot.timeSpentSeconds || 0) > 0);
  const averageTimeSeconds = timedSnapshots.length
    ? roundScore(timedSnapshots.reduce((sum, snapshot) => sum + Number(snapshot.timeSpentSeconds || 0), 0) / timedSnapshots.length)
    : 0;

  const mapQuestionTiming = (snapshot) => ({
    questionId: snapshot.questionId,
    order: snapshot.order,
    topic: snapshot.subject,
    verdict: snapshot.verdict,
    timeSpentSeconds: Number(snapshot.timeSpentSeconds || 0),
    questionPreview: truncateText(snapshot.question, 120),
  });

  const slowQuestions = averageTimeSeconds
    ? timedSnapshots
        .filter((snapshot) => Number(snapshot.timeSpentSeconds || 0) >= averageTimeSeconds * 1.25)
        .sort((left, right) => Number(right.timeSpentSeconds || 0) - Number(left.timeSpentSeconds || 0))
        .slice(0, 5)
        .map(mapQuestionTiming)
    : [];

  const fastQuestions = averageTimeSeconds
    ? timedSnapshots
        .filter((snapshot) => Number(snapshot.timeSpentSeconds || 0) <= averageTimeSeconds * 0.75)
        .sort((left, right) => Number(left.timeSpentSeconds || 0) - Number(right.timeSpentSeconds || 0))
        .slice(0, 5)
        .map(mapQuestionTiming)
    : [];

  return {
    totalTimeSeconds: Number(totalTimeSeconds || 0),
    averageTimeSeconds,
    slowQuestions,
    fastQuestions,
  };
};

const buildStrongTopics = (topicPerformance = []) =>
  topicPerformance
    .filter((topic) => topic.total > 0)
    .sort((left, right) => right.accuracy - left.accuracy || right.correct - left.correct)
    .slice(0, 3)
    .map((topic) => topic.topic);

const buildWeakTopics = (topicPerformance = []) =>
  topicPerformance
    .filter((topic) => topic.total > 0)
    .sort((left, right) => left.accuracy - right.accuracy || right.total - left.total)
    .slice(0, 3)
    .map((topic) => topic.topic);

const computeAttemptAnalytics = ({
  questions = [],
  answers = {},
  exam = null,
  perQuestionTimes = [],
  totalTimeSeconds = 0,
}) => {
  const summary = calculateAttemptSummary(questions, answers, exam);
  const snapshots = buildAttemptQuestionSnapshots(questions, answers, exam, perQuestionTimes);
  const attempted = summary.correct + summary.partial + summary.wrong;
  const accuracy = toPercentage(summary.correct + summary.partial * 0.5, Math.max(attempted, 1));
  const topicPerformance = buildGroupedPerformance(snapshots, (snapshot) => snapshot.subject, "topic");
  const difficultyPerformance = buildGroupedPerformance(
    snapshots,
    (snapshot) => snapshot.difficulty || "unspecified",
    "difficulty"
  );

  return {
    summary: {
      ...summary,
      attempted,
      accuracy,
    },
    snapshots,
    topicPerformance,
    difficultyPerformance,
    strongTopics: buildStrongTopics(topicPerformance),
    weakTopics: buildWeakTopics(topicPerformance),
    timeAnalysis: buildTimeAnalysis(snapshots, totalTimeSeconds),
  };
};

const buildProgressSeries = (attempts = []) =>
  [...attempts]
    .sort((left, right) => new Date(left.completedAt || left.startedAt || 0) - new Date(right.completedAt || right.startedAt || 0))
    .map((attempt) => ({
      attemptId: String(attempt._id),
      date: (attempt.completedAt || attempt.startedAt || new Date()).toISOString(),
      testTitle: attempt.testTitle || "Practice Test",
      accuracy: Number(attempt.accuracy || 0),
      score: Number(attempt.score || 0),
      totalMarks: Number(attempt.totalMarks || 0),
    }));

const computeStudentAnalytics = (attempts = []) => {
  const completedAttempts = attempts.filter((attempt) => attempt.status === "COMPLETED");
  const snapshots = completedAttempts.flatMap((attempt) => attempt.questionSnapshots || []);
  const latestAttempt = [...completedAttempts].sort(
    (left, right) => new Date(right.completedAt || right.startedAt || 0) - new Date(left.completedAt || left.startedAt || 0)
  )[0];

  const topicPerformance = buildGroupedPerformance(snapshots, (snapshot) => snapshot.subject, "topic");
  const difficultyPerformance = buildGroupedPerformance(
    snapshots,
    (snapshot) => snapshot.difficulty || "unspecified",
    "difficulty"
  );
  const progressOverTime = buildProgressSeries(completedAttempts);
  const averageAccuracy = progressOverTime.length
    ? roundScore(progressOverTime.reduce((sum, attempt) => sum + Number(attempt.accuracy || 0), 0) / progressOverTime.length)
    : 0;
  const averageScore = progressOverTime.length
    ? roundScore(progressOverTime.reduce((sum, attempt) => sum + Number(attempt.score || 0), 0) / progressOverTime.length)
    : 0;

  return {
    attemptCount: completedAttempts.length,
    averageAccuracy,
    averageScore,
    latestAttempt: latestAttempt
      ? {
          attemptId: String(latestAttempt._id),
          testTitle: latestAttempt.testTitle || "Practice Test",
          accuracy: Number(latestAttempt.accuracy || 0),
          score: Number(latestAttempt.score || 0),
          totalMarks: Number(latestAttempt.totalMarks || 0),
          timeTakenSeconds: Number(latestAttempt.timeTakenSeconds || 0),
        }
      : null,
    topicPerformance,
    difficultyPerformance,
    weakestTopicsRanking: [...topicPerformance]
      .sort((left, right) => left.accuracy - right.accuracy || right.total - left.total)
      .slice(0, 5),
    progressOverTime,
    timeSpentPerQuestion:
      latestAttempt?.questionSnapshots?.map((snapshot) => ({
        questionId: snapshot.questionId,
        order: snapshot.order,
        questionPreview: truncateText(snapshot.question, 120),
        topic: snapshot.subject,
        timeSpentSeconds: Number(snapshot.timeSpentSeconds || 0),
        verdict: snapshot.verdict,
      })) || [],
    strongTopics: buildStrongTopics(topicPerformance),
    weakTopics: buildWeakTopics(topicPerformance),
  };
};

const buildRecommendationSeed = (analytics) => {
  const weakTopics = analytics.weakTopics || [];
  const difficultyAdjustment =
    analytics.averageAccuracy >= 80
      ? "hard"
      : analytics.averageAccuracy >= 60
        ? "medium"
        : "easy";

  const topicsToRevise = weakTopics.length ? weakTopics : ["General revision"];
  const practiceSuggestions = topicsToRevise.map((topic, index) => {
    const baseCount = difficultyAdjustment === "easy" ? 8 : difficultyAdjustment === "medium" ? 10 : 12;
    return `Practice ${baseCount + index * 2} ${difficultyAdjustment} questions on ${topic}`;
  });

  return {
    topicsToRevise,
    practiceSuggestions,
    difficultyAdjustment,
  };
};

const buildPrediction = ({ analytics, benchmarkAccuracies = [] }) => {
  const accuracies = analytics.progressOverTime.map((item) => Number(item.accuracy || 0));
  const currentAccuracy = accuracies.length ? accuracies[accuracies.length - 1] : analytics.averageAccuracy || 0;
  const deltas = accuracies.slice(1).map((value, index) => value - accuracies[index]);
  const trend = deltas.length ? deltas.reduce((sum, value) => sum + value, 0) / deltas.length : 0;
  const improvementPotential = Math.min((analytics.weakTopics?.length || 0) * 2, 8);
  const expectedAccuracy = Math.max(25, Math.min(99, roundScore(currentAccuracy + trend * 0.6 + improvementPotential * 0.4)));
  const futureScoreImprovement = roundScore(expectedAccuracy - currentAccuracy);
  const probabilityOfImprovement = Math.max(
    25,
    Math.min(95, roundScore(55 + Math.max(trend, 0) * 1.8 + improvementPotential * 2 - Math.max(-trend, 0) * 1.2))
  );

  const cohort = benchmarkAccuracies.filter((value) => Number.isFinite(Number(value)));
  const expectedRank = cohort.length
    ? 1 + cohort.filter((value) => Number(value) > expectedAccuracy).length
    : 1;

  return {
    currentAccuracy: roundScore(currentAccuracy),
    expectedAccuracy,
    futureScoreImprovement,
    probabilityOfImprovement,
    expectedRank,
    cohortSize: cohort.length || 1,
  };
};

module.exports = {
  computeAttemptAnalytics,
  computeStudentAnalytics,
  buildRecommendationSeed,
  buildPrediction,
};
