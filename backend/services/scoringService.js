const { stripHtml, optionIndexToLabel, normalizeWrittenAnswer } = require("../utils/plainText");

const roundScore = (value) => Math.round(Number(value || 0) * 100) / 100;

const resolveSubjects = (examOrSubjects) => {
  if (Array.isArray(examOrSubjects)) return examOrSubjects;
  if (examOrSubjects?.subjects && Array.isArray(examOrSubjects.subjects)) return examOrSubjects.subjects;
  return [];
};

const normalizeNumberArray = (value) =>
  Array.isArray(value)
    ? value
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item))
        .sort((left, right) => left - right)
    : [];

const isAnswered = (question, answer) => {
  if (question.questionType === "multiple") {
    return Array.isArray(answer) && answer.length > 0;
  }

  if (question.questionType === "written") {
    return typeof answer === "string" && answer.trim().length > 0;
  }

  return answer !== null && answer !== undefined && answer !== "";
};

const isCorrectAnswer = (question, answer) => {
  if (question.questionType === "multiple") {
    const selected = normalizeNumberArray(answer);
    const correct = normalizeNumberArray(question.correctAnswers || []);
    return selected.length === correct.length && selected.every((value, index) => value === correct[index]);
  }

  if (question.questionType === "written") {
    return typeof answer === "string" && normalizeWrittenAnswer(answer) === normalizeWrittenAnswer(question.writtenAnswer || "");
  }

  return Number(answer) === Number(question.correctAnswer);
};

const getQuestionMarking = (question, examOrSubjects) => {
  const subjects = resolveSubjects(examOrSubjects);
  const subjectRule = subjects.find((subject) => subject.name === question.subject);
  const positiveMarks = question.marksPerQuestion ?? subjectRule?.marksPerQuestion ?? 1;
  const negativeMarks = question.negativeMarksPerQuestion ?? subjectRule?.negativeMarksPerQuestion ?? 0;

  return {
    positiveMarks: Number(positiveMarks || 0),
    negativeMarks: Number(negativeMarks || 0),
  };
};

const getMultipleChoiceScore = (question, answer, positiveMarks, negativeMarks) => {
  const selected = normalizeNumberArray(answer);
  const correct = normalizeNumberArray(question.correctAnswers || []);
  const mode = question.multipleCorrectScoringMode || "full_only";
  const correctSet = new Set(correct);
  const selectedCorrect = selected.filter((value) => correctSet.has(value)).length;
  const selectedWrong = selected.filter((value) => !correctSet.has(value)).length;
  const totalCorrect = correct.length || 1;
  const isExact = selected.length === correct.length && selectedWrong === 0 && selectedCorrect === correct.length;
  const positiveFraction = selectedCorrect / totalCorrect;

  if (isExact) {
    return { score: roundScore(positiveMarks), verdict: "correct" };
  }

  if (selected.length === 0) {
    return { score: 0, verdict: "unanswered" };
  }

  if (mode === "no_negative_multiple") {
    if (selectedWrong === 0 && selectedCorrect > 0) {
      return { score: roundScore(positiveMarks * positiveFraction), verdict: "partial" };
    }
    return { score: 0, verdict: "wrong" };
  }

  if (mode === "partial_positive") {
    if (selectedWrong === 0 && selectedCorrect > 0) {
      return { score: roundScore(positiveMarks * positiveFraction), verdict: "partial" };
    }
    return { score: -roundScore(negativeMarks), verdict: "wrong" };
  }

  if (mode === "partial_with_negative") {
    const partialScore = roundScore((positiveMarks * positiveFraction) - negativeMarks * selectedWrong);
    if (selectedCorrect > 0 || selectedWrong > 0) {
      return {
        score: Math.max(-roundScore(negativeMarks), partialScore),
        verdict: partialScore > 0 ? "partial" : "wrong",
      };
    }
  }

  return { score: -roundScore(negativeMarks), verdict: "wrong" };
};

const getQuestionScore = (question, answer, examOrSubjects) => {
  const { positiveMarks, negativeMarks } = getQuestionMarking(question, examOrSubjects);

  if (!isAnswered(question, answer)) {
    return { score: 0, verdict: "unanswered", positiveMarks, negativeMarks };
  }

  if (question.questionType === "multiple") {
    const result = getMultipleChoiceScore(question, answer, positiveMarks, negativeMarks);
    return { ...result, positiveMarks, negativeMarks };
  }

  if (isCorrectAnswer(question, answer)) {
    return { score: positiveMarks, verdict: "correct", positiveMarks, negativeMarks };
  }

  return { score: -negativeMarks, verdict: "wrong", positiveMarks, negativeMarks };
};

const calculateAttemptSummary = (questions = [], answers = {}, examOrSubjects) =>
  questions.reduce(
    (summary, question, index) => {
      const answer = answers?.[index] ?? answers?.[String(index)] ?? null;
      const { score, verdict, positiveMarks } = getQuestionScore(question, answer, examOrSubjects);
      summary.totalMarks += positiveMarks;

      if (verdict === "unanswered") {
        summary.unanswered += 1;
        return summary;
      }

      if (verdict === "correct") {
        summary.correct += 1;
        summary.score += score;
        return summary;
      }

      if (verdict === "partial") {
        summary.partial += 1;
        summary.score += score;
        return summary;
      }

      summary.wrong += 1;
      summary.score += score;
      return summary;
    },
    { score: 0, correct: 0, partial: 0, wrong: 0, unanswered: 0, totalMarks: 0 }
  );

const toPlainOptions = (options = []) =>
  options.map((option, index) => ({
    key: optionIndexToLabel(index),
    text: stripHtml(typeof option === "string" ? option : option?.text || ""),
    imageUrl: typeof option === "string" ? "" : option?.imageUrl || "",
  }));

const serializeAnswer = (question, answer, options = []) => {
  if (!isAnswered(question, answer)) return "Not answered";

  if (question.questionType === "written") {
    return String(answer || "").trim() || "Not answered";
  }

  const optionLookup = toPlainOptions(options);
  const resolveOption = (index) => optionLookup[index] || { key: optionIndexToLabel(index), text: "" };

  if (question.questionType === "multiple") {
    return normalizeNumberArray(answer).map((index) => resolveOption(index));
  }

  const selected = resolveOption(Number(answer));
  return selected;
};

const resolveCorrectAnswer = (question, options = []) => {
  if (question.questionType === "written") {
    return (question.writtenAnswer || "").trim();
  }

  const optionLookup = toPlainOptions(options);
  if (question.questionType === "multiple") {
    return normalizeNumberArray(question.correctAnswers || []).map((index) => optionLookup[index] || { key: optionIndexToLabel(index), text: "" });
  }

  const index = Number(question.correctAnswer ?? 0);
  return optionLookup[index] || { key: optionIndexToLabel(index), text: "" };
};

const buildQuestionSnapshot = (question, index, answer, examOrSubjects, timeSpentSeconds = 0) => {
  const options = question.options || [];
  const questionType = question.questionType || "single";
  const score = getQuestionScore(question, answer, examOrSubjects);
  return {
    questionId: String(question._id || question.id || index),
    order: index + 1,
    subject: question.subject || "General",
    difficulty: question.difficulty || "unspecified",
    questionType,
    question: stripHtml(question.question || ""),
    options: toPlainOptions(options),
    correctAnswer: resolveCorrectAnswer(question, options),
    studentAnswer: serializeAnswer({ ...question, questionType }, answer, options),
    explanation: stripHtml(question.explanation || ""),
    marks: score.positiveMarks,
    negativeMarks: score.negativeMarks,
    verdict: score.verdict,
    score: roundScore(score.score),
    timeSpentSeconds: Number(timeSpentSeconds || 0),
  };
};

const buildAttemptQuestionSnapshots = (questions = [], answers = {}, examOrSubjects, perQuestionTimes = []) =>
  questions.map((question, index) =>
    buildQuestionSnapshot(
      question,
      index,
      answers?.[index] ?? answers?.[String(index)] ?? null,
      examOrSubjects,
      perQuestionTimes?.[index] ?? perQuestionTimes?.[String(index)] ?? 0
    )
  );

module.exports = {
  roundScore,
  isAnswered,
  isCorrectAnswer,
  getQuestionMarking,
  getMultipleChoiceScore,
  getQuestionScore,
  calculateAttemptSummary,
  buildQuestionSnapshot,
  buildAttemptQuestionSnapshots,
  serializeAnswer,
  resolveCorrectAnswer,
  toPlainOptions,
};
