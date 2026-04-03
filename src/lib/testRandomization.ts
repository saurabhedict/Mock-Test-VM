import type { AnswerValue, MultipleCorrectScoringMode, QuestionType } from "@/lib/scoring";

export interface BaseTestOption {
  text: string;
  imageUrl?: string;
}

export interface BaseTestQuestion {
  id: string;
  question: string;
  questionType: QuestionType;
  questionImage?: string;
  options: BaseTestOption[];
  correctAnswer?: number;
  correctAnswers?: number[];
  writtenAnswer?: string;
  subject: string;
  explanation: string;
  explanationImage?: string;
  marksPerQuestion?: number;
  negativeMarksPerQuestion?: number;
  multipleCorrectScoringMode?: MultipleCorrectScoringMode;
}

export interface DisplayTestOption extends BaseTestOption {
  originalIndex: number;
}

export interface DisplayTestQuestion extends Omit<BaseTestQuestion, "options"> {
  options: DisplayTestOption[];
  originalQuestionIndex: number;
}

export interface SavedTestOrderState {
  questionOrder?: string[];
  optionOrderByQuestionId?: Record<string, number[]>;
}

export interface TestRandomizationConfig {
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
}

export interface PreparedTestQuestions {
  questions: DisplayTestQuestion[];
  questionOrder: string[];
  optionOrderByQuestionId: Record<string, number[]>;
}

const buildSequentialOrder = (count: number) => Array.from({ length: count }, (_, index) => index);

const shuffleIndices = (count: number) => {
  const next = buildSequentialOrder(count);

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
};

const isValidQuestionOrder = (candidate: unknown, ids: string[]) => {
  if (!Array.isArray(candidate) || candidate.length !== ids.length) return false;
  const expectedIds = [...ids].sort();
  const receivedIds = candidate.map((value) => String(value)).sort();
  return expectedIds.every((id, index) => id === receivedIds[index]);
};

const isValidOptionOrder = (candidate: unknown, optionCount: number) => {
  if (!Array.isArray(candidate) || candidate.length !== optionCount) return false;
  const expected = buildSequentialOrder(optionCount);
  const received = candidate.map((value) => Number(value)).sort((left, right) => left - right);
  return expected.every((value, index) => value === received[index]);
};

const mapQuestionToDisplay = (
  question: BaseTestQuestion,
  originalQuestionIndex: number,
  optionOrder: number[],
): DisplayTestQuestion => {
  const reorderedOptions = optionOrder.map((originalIndex) => ({
    ...question.options[originalIndex],
    originalIndex,
  }));

  const optionIndexLookup = optionOrder.reduce<Record<number, number>>((lookup, originalIndex, displayIndex) => {
    lookup[originalIndex] = displayIndex;
    return lookup;
  }, {});

  const mappedCorrectAnswers =
    question.questionType === "written"
      ? []
      : (question.correctAnswers || [])
          .map((originalIndex) => optionIndexLookup[originalIndex])
          .filter((displayIndex) => Number.isInteger(displayIndex))
          .sort((left, right) => left - right);

  const mappedCorrectAnswer =
    question.questionType === "written"
      ? -1
      : question.correctAnswer === undefined || question.correctAnswer < 0
        ? question.correctAnswer
        : optionIndexLookup[question.correctAnswer] ?? question.correctAnswer;

  return {
    ...question,
    options: reorderedOptions,
    correctAnswer: mappedCorrectAnswer,
    correctAnswers: mappedCorrectAnswers,
    originalQuestionIndex,
  };
};

export const prepareTestQuestions = (
  rawQuestions: BaseTestQuestion[],
  config: TestRandomizationConfig = {},
  savedOrderState: SavedTestOrderState = {},
): PreparedTestQuestions => {
  const rawIds = rawQuestions.map((question) => question.id);
  const byId = new Map(rawQuestions.map((question, index) => [question.id, { question, index }] as const));
  const questionOrder = isValidQuestionOrder(savedOrderState.questionOrder, rawIds)
    ? savedOrderState.questionOrder!.map((id) => String(id))
    : config.shuffleQuestions
      ? shuffleIndices(rawQuestions.length).map((index) => rawQuestions[index].id)
      : rawIds;

  const optionOrderByQuestionId = rawQuestions.reduce<Record<string, number[]>>((result, question) => {
    const optionCount = Array.isArray(question.options) ? question.options.length : 0;
    const savedOptionOrder = savedOrderState.optionOrderByQuestionId?.[question.id];

    if (isValidOptionOrder(savedOptionOrder, optionCount)) {
      result[question.id] = savedOptionOrder!.map((value) => Number(value));
      return result;
    }

    result[question.id] =
      config.shuffleOptions && question.questionType !== "written"
        ? shuffleIndices(optionCount)
        : buildSequentialOrder(optionCount);
    return result;
  }, {});

  const questions = questionOrder.map((questionId) => {
    const matchedQuestion = byId.get(questionId);
    if (!matchedQuestion) {
      throw new Error(`Missing question for id ${questionId}`);
    }

    return mapQuestionToDisplay(
      matchedQuestion.question,
      matchedQuestion.index,
      optionOrderByQuestionId[questionId] || buildSequentialOrder(matchedQuestion.question.options.length),
    );
  });

  return {
    questions,
    questionOrder,
    optionOrderByQuestionId,
  };
};

export const reorderQuestionUsingSavedOptions = (
  question: BaseTestQuestion,
  optionOrder?: number[],
  originalQuestionIndex = 0,
) => {
  const safeOptionOrder = isValidOptionOrder(optionOrder, question.options.length)
    ? optionOrder!
    : buildSequentialOrder(question.options.length);

  return mapQuestionToDisplay(question, originalQuestionIndex, safeOptionOrder);
};

export const convertDisplayAnswerToOriginal = (
  question: DisplayTestQuestion,
  answer: AnswerValue,
): AnswerValue => {
  if (question.questionType === "written") {
    return typeof answer === "string" ? answer : "";
  }

  if (question.questionType === "multiple") {
    return Array.isArray(answer)
      ? answer
          .map((displayIndex) => question.options[displayIndex]?.originalIndex)
          .filter((originalIndex) => Number.isInteger(originalIndex))
          .sort((left, right) => left - right)
      : [];
  }

  if (answer === null || answer === undefined || answer === "") {
    return null;
  }

  const originalIndex = question.options[Number(answer)]?.originalIndex;
  return Number.isInteger(originalIndex) ? originalIndex : Number(answer);
};

export const buildOriginalAnswersPayload = (
  questions: DisplayTestQuestion[],
  answers: Record<number | string, AnswerValue>,
) =>
  questions.reduce<Record<number, AnswerValue>>((result, question, displayIndex) => {
    result[question.originalQuestionIndex] = convertDisplayAnswerToOriginal(
      question,
      answers[displayIndex] ?? answers[String(displayIndex)] ?? null,
    );
    return result;
  }, {});

export const buildOriginalQuestionTimesPayload = (
  questions: DisplayTestQuestion[],
  questionTimes: Record<number | string, number>,
) =>
  questions.reduce<number[]>((result, question, displayIndex) => {
    result[question.originalQuestionIndex] = Number(questionTimes[displayIndex] ?? questionTimes[String(displayIndex)] ?? 0);
    return result;
  }, Array.from({ length: questions.length }, () => 0));
