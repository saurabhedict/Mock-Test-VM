const questionInsightSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    questionId: { type: "string" },
    solutionSteps: {
      type: "array",
      items: { type: "string" },
    },
    simpleExplanation: { type: "string" },
    wrongOptionReasons: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          optionKey: { type: "string" },
          reason: { type: "string" },
        },
        required: ["optionKey", "reason"],
      },
    },
  },
  required: ["questionId", "solutionSteps", "simpleExplanation", "wrongOptionReasons"],
};

const analyzeTestSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    improvementSuggestions: {
      type: "array",
      items: { type: "string" },
    },
    questionInsights: {
      type: "array",
      items: questionInsightSchema,
    },
  },
  required: ["summary", "improvementSuggestions", "questionInsights"],
};

const chatSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply: { type: "string" },
    suggestedPrompts: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["reply", "suggestedPrompts"],
};

const optionMapSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    A: { type: "string" },
    B: { type: "string" },
    C: { type: "string" },
    D: { type: "string" },
  },
  required: ["A", "B", "C", "D"],
};

const parsedQuestionsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          question: { type: "string" },
          options: optionMapSchema,
          correctAnswer: { type: "string" },
        },
        required: ["question", "options", "correctAnswer"],
      },
    },
  },
  required: ["questions"],
};

const generatedQuestionsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          question: { type: "string" },
          options: optionMapSchema,
          correctAnswer: { type: "string" },
          explanation: { type: "string" },
        },
        required: ["question", "options", "correctAnswer", "explanation"],
      },
    },
  },
  required: ["questions"],
};

const studyPlanSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    studyPlan: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["summary", "studyPlan"],
};

const predictionNarrativeSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    insight: { type: "string" },
  },
  required: ["insight"],
};

module.exports = {
  analyzeTestSchema,
  chatSchema,
  parsedQuestionsSchema,
  generatedQuestionsSchema,
  studyPlanSchema,
  predictionNarrativeSchema,
};
