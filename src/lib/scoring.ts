export type QuestionType = "single" | "multiple" | "written";
export type AnswerValue = number | number[] | string | null;
export type MultipleCorrectScoringMode =
  | "full_only"
  | "partial_positive"
  | "partial_with_negative"
  | "no_negative_multiple";

export interface QuestionMarkingRule {
  subject?: string;
  questionType?: QuestionType;
  multipleCorrectScoringMode?: MultipleCorrectScoringMode;
  correctAnswer?: number;
  correctAnswers?: number[];
  writtenAnswer?: string;
  marksPerQuestion?: number;
  negativeMarksPerQuestion?: number;
}

export interface ExamSubjectMarkingRule {
  name: string;
  marksPerQuestion: number;
  negativeMarksPerQuestion?: number;
}

export const isSameSubject = (subject1?: string, subject2?: string) => {
  const norm1 = subject1?.trim().toLowerCase() || "";
  const norm2 = subject2?.trim().toLowerCase() || "";
  if (!norm1 || !norm2) return false;
  if (norm1 === norm2) return true;
  if (norm1.length > 3 && norm2.includes(norm1)) return true;
  if (norm2.length > 3 && norm1.includes(norm2)) return true;
  return false;
};

const ENTITY_MAP: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

const decodeEntities = (value = "") =>
  Object.entries(ENTITY_MAP).reduce(
    (result, [entity, replacement]) => result.replace(new RegExp(entity, "g"), replacement),
    value,
  );

const stripRichText = (value = "") =>
  decodeEntities(
    String(value)
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );

const unwrapMathDelimiters = (value = "") => {
  let normalized = String(value).trim();

  while (normalized.length > 1) {
    if (normalized.startsWith("$$") && normalized.endsWith("$$")) {
      normalized = normalized.slice(2, -2).trim();
      continue;
    }

    if (normalized.startsWith("$") && normalized.endsWith("$")) {
      normalized = normalized.slice(1, -1).trim();
      continue;
    }

    break;
  }

  return normalized;
};

const normalizeWrittenAnswer = (value = "") =>
  unwrapMathDelimiters(stripRichText(value))
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export const isAnswered = (question: QuestionMarkingRule, answer: AnswerValue) => {
  if (question.questionType === "multiple") return Array.isArray(answer) && answer.length > 0;
  if (question.questionType === "written") return typeof answer === "string" && answer.trim().length > 0;
  return answer !== null && answer !== undefined && answer !== "";
};

export const isCorrectAnswer = (question: QuestionMarkingRule, answer: AnswerValue) => {
  if (question.questionType === "multiple") {
    const selected = Array.isArray(answer) ? [...answer].sort((a, b) => a - b) : [];
    const correct = [...(question.correctAnswers || [])].sort((a, b) => a - b);
    return selected.length === correct.length && selected.every((value, index) => value === correct[index]);
  }

  if (question.questionType === "written") {
    return typeof answer === "string" && normalizeWrittenAnswer(answer) === normalizeWrittenAnswer(question.writtenAnswer || "");
  }

  return Number(answer) === Number(question.correctAnswer);
};

const roundScore = (value: number) => Math.round(value * 100) / 100;

export const getMultipleChoiceScore = (
  question: QuestionMarkingRule,
  answer: AnswerValue,
  positiveMarks: number,
  negativeMarks: number,
) => {
  const selected = Array.isArray(answer) ? [...answer].map(Number) : [];
  const correct = [...(question.correctAnswers || [])].map(Number);
  const mode = question.multipleCorrectScoringMode || "full_only";
  const correctSet = new Set(correct);
  const selectedCorrect = selected.filter((value) => correctSet.has(value)).length;
  const selectedWrong = selected.filter((value) => !correctSet.has(value)).length;
  const totalCorrect = correct.length || 1;
  const isExact = selected.length === correct.length && selectedWrong === 0 && selectedCorrect === correct.length;
  const positiveFraction = selectedCorrect / totalCorrect;

  if (isExact) {
    return { score: roundScore(positiveMarks), verdict: "correct" as const };
  }

  if (selected.length === 0) {
    return { score: 0, verdict: "unanswered" as const };
  }

  if (mode === "no_negative_multiple") {
    if (selectedWrong === 0 && selectedCorrect > 0) {
      return { score: roundScore(positiveMarks * positiveFraction), verdict: "partial" as const };
    }
    return { score: 0, verdict: "wrong" as const };
  }

  if (mode === "partial_positive") {
    if (selectedWrong === 0 && selectedCorrect > 0) {
      return { score: roundScore(positiveMarks * positiveFraction), verdict: "partial" as const };
    }
    return { score: -roundScore(negativeMarks), verdict: "wrong" as const };
  }

  if (mode === "partial_with_negative") {
    const partialScore = roundScore((positiveMarks * positiveFraction) - (negativeMarks * selectedWrong));
    if (selectedCorrect > 0 || selectedWrong > 0) {
      return {
        score: Math.max(-roundScore(negativeMarks), partialScore),
        verdict: partialScore > 0 ? ("partial" as const) : ("wrong" as const),
      };
    }
  }

  return { score: -roundScore(negativeMarks), verdict: "wrong" as const };
};

export const getQuestionScore = (
  question: QuestionMarkingRule,
  answer: AnswerValue,
  subjects: ExamSubjectMarkingRule[] = [],
) => {
  const { positiveMarks, negativeMarks } = getQuestionMarking(question, subjects);

  if (!isAnswered(question, answer)) {
    return { score: 0, verdict: "unanswered" as const, positiveMarks, negativeMarks };
  }

  if (question.questionType === "multiple") {
    const result = getMultipleChoiceScore(question, answer, positiveMarks, negativeMarks);
    return { ...result, positiveMarks, negativeMarks };
  }

  if (isCorrectAnswer(question, answer)) {
    return { score: positiveMarks, verdict: "correct" as const, positiveMarks, negativeMarks };
  }

  return { score: -negativeMarks, verdict: "wrong" as const, positiveMarks, negativeMarks };
};

export const getQuestionMarking = (
  question: QuestionMarkingRule,
  subjects: ExamSubjectMarkingRule[] = [],
) => {
  const subjectRule = subjects.find((subject) => isSameSubject(subject.name, question.subject));

  return {
    positiveMarks: Number(subjectRule?.marksPerQuestion ?? question.marksPerQuestion ?? 1),
    negativeMarks: Number(subjectRule?.negativeMarksPerQuestion ?? question.negativeMarksPerQuestion ?? 0),
  };
};

export const calculateScoreSummary = (
  questions: QuestionMarkingRule[],
  answers: Record<number | string, AnswerValue>,
  subjects: ExamSubjectMarkingRule[] = [],
) => {
  return questions.reduce(
    (summary, question, index) => {
      const answer = answers[index] ?? answers[String(index)] ?? null;
      const { score, verdict, positiveMarks } = getQuestionScore(question, answer, subjects);
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
    { score: 0, correct: 0, partial: 0, wrong: 0, unanswered: 0, totalMarks: 0 },
  );
};
