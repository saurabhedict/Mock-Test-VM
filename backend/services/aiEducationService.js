const crypto = require("crypto");
const Test = require("../models/Test");
const Exam = require("../models/Exam");
const TestAttempt = require("../models/TestAttempt");
const AIChatSession = require("../models/AIChatSession");
const { createStructuredResponse } = require("./llmService");
const {
  computeAttemptAnalytics,
  computeStudentAnalytics,
  buildRecommendationSeed,
  buildPrediction,
} = require("./learningAnalyticsService");
const { resolveCorrectAnswer, serializeAnswer, toPlainOptions } = require("./scoringService");
const {
  analyzeTestSchema,
  chatSchema,
  parsedQuestionsSchema,
  generatedQuestionsSchema,
  studyPlanSchema,
  predictionNarrativeSchema,
} = require("./aiSchemas");
const { stripHtml, truncateText } = require("../utils/plainText");

const DEFAULT_MODELS = {
  analysis:
    process.env.GEMINI_MODEL_ANALYSIS ||
    process.env.AI_MODEL_ANALYSIS ||
    process.env.OPENAI_MODEL_ANALYSIS ||
    process.env.GEMINI_MODEL_GENERAL ||
    process.env.AI_MODEL_GENERAL ||
    process.env.OPENAI_MODEL_GENERAL ||
    "gemini-2.5-flash-lite",
  chat:
    process.env.GEMINI_MODEL_CHAT ||
    process.env.AI_MODEL_CHAT ||
    process.env.OPENAI_MODEL_CHAT ||
    process.env.GEMINI_MODEL_GENERAL ||
    process.env.AI_MODEL_GENERAL ||
    process.env.OPENAI_MODEL_GENERAL ||
    "gemini-2.5-flash-lite",
  parser:
    process.env.GEMINI_MODEL_PARSER ||
    process.env.AI_MODEL_PARSER ||
    process.env.OPENAI_MODEL_PARSER ||
    process.env.GEMINI_MODEL_GENERAL ||
    process.env.AI_MODEL_GENERAL ||
    process.env.OPENAI_MODEL_GENERAL ||
    "gemini-2.5-flash-lite",
  questions:
    process.env.GEMINI_MODEL_QUESTION_GENERATION ||
    process.env.AI_MODEL_QUESTION_GENERATION ||
    process.env.OPENAI_MODEL_QUESTION_GENERATION ||
    process.env.GEMINI_MODEL_GENERAL ||
    process.env.AI_MODEL_GENERAL ||
    process.env.OPENAI_MODEL_GENERAL ||
    "gemini-2.5-flash-lite",
  summary:
    process.env.GEMINI_MODEL_SUMMARY ||
    process.env.AI_MODEL_SUMMARY ||
    process.env.OPENAI_MODEL_SUMMARY ||
    process.env.GEMINI_MODEL_GENERAL ||
    process.env.AI_MODEL_GENERAL ||
    process.env.OPENAI_MODEL_GENERAL ||
    "gemini-2.5-flash-lite",
};

const MARKDOWN_MATH_FORMATTING_GUIDANCE =
  "Format all string fields as clean Markdown, never raw HTML. Wrap inline math in $...$ and standalone equations in $$...$$. Use fenced code blocks for code and escape LaTeX backslashes correctly.";

const withMarkdownMathGuidance = (instruction) => `${instruction} ${MARKDOWN_MATH_FORMATTING_GUIDANCE}`;
const CHAT_ATTACHMENT_COUNT_LIMIT = 4;
const CHAT_ATTACHMENT_TEXT_LIMIT = 6000;

const chunkArray = (items = [], chunkSize = 6) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
};

const normalizeQuestionForAI = (question, index, answer) => ({
  questionId: String(question._id || question.id || index),
  order: index + 1,
  subject: question.subject || "General",
  difficulty: question.difficulty || "unspecified",
  question: stripHtml(question.question || ""),
  options: toPlainOptions(question.options || []),
  studentAnswer: serializeAnswer(question, answer, question.options || []),
  correctAnswer: resolveCorrectAnswer(question, question.options || []),
  explanation: stripHtml(question.explanation || ""),
});

const mergeCustomQuestions = (questions = [], correctAnswers = []) =>
  questions.map((question, index) => {
    const providedCorrectAnswer = correctAnswers?.[index] ?? correctAnswers?.[String(index)];

    if (question.questionType === "multiple") {
      const normalizedCorrectAnswers = Array.isArray(providedCorrectAnswer)
        ? providedCorrectAnswer.map((value) => Number(value))
        : Array.isArray(question.correctAnswers)
          ? question.correctAnswers.map((value) => Number(value))
          : [];

      return {
        ...question,
        correctAnswers: normalizedCorrectAnswers,
        correctAnswer: normalizedCorrectAnswers[0] ?? question.correctAnswer ?? 0,
      };
    }

    if (question.questionType === "written") {
      return {
        ...question,
        writtenAnswer:
          typeof providedCorrectAnswer === "string"
            ? providedCorrectAnswer
            : question.writtenAnswer || "",
      };
    }

    return {
      ...question,
      correctAnswer:
        providedCorrectAnswer !== undefined
          ? Number(providedCorrectAnswer)
          : Number(question.correctAnswer ?? 0),
      correctAnswers:
        Array.isArray(question.correctAnswers) && question.correctAnswers.length
          ? question.correctAnswers.map((value) => Number(value))
          : [Number(providedCorrectAnswer ?? question.correctAnswer ?? 0)],
    };
  });

const resolveAttemptPayload = async (payload = {}) => {
  const { testId, questions, correctAnswers, answers = {}, perQuestionTimes = [], timeTaken } = payload;

  if (testId) {
    const test = await Test.findById(testId).populate("questions").lean();
    if (!test) {
      const error = new Error("Test not found");
      error.status = 404;
      throw error;
    }

    const exam = await Exam.findOne({ slug: test.exam }).lean();
    return {
      testId: String(testId),
      testTitle: test.title || "Practice Test",
      examId: test.exam || "",
      questions: test.questions || [],
      answers,
      exam,
      perQuestionTimes,
      timeTaken: Number(timeTaken || 0),
    };
  }

  return {
    testId: "",
    testTitle: "Custom Analysis",
    examId: "",
    questions: mergeCustomQuestions(Array.isArray(questions) ? questions : [], correctAnswers || []),
    answers,
    exam: null,
    perQuestionTimes,
    timeTaken: Number(timeTaken || 0),
  };
};

const generateQuestionInsights = async (questions = [], answers = {}) => {
  const normalizedQuestions = questions.map((question, index) =>
    normalizeQuestionForAI(question, index, answers?.[index] ?? answers?.[String(index)] ?? null)
  );

  const responses = [];
  for (const chunk of chunkArray(normalizedQuestions, 3)) {
    const result = await createStructuredResponse({
      model: DEFAULT_MODELS.analysis,
      schemaName: "test_analysis_chunk",
      schema: analyzeTestSchema,
      maxOutputTokens: 2400,
      instructions: withMarkdownMathGuidance(
        "You are an exam coach. Return concise JSON only. Create student-friendly step-by-step solutions. Keep each step very short, practical, and faithful to the question. Limit each question to 2 to 4 solution steps and keep wrong-option reasons to one sentence each. If a question has limited context, say what assumption was used.",
      ),
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({ questions: chunk }),
            },
          ],
        },
      ],
    });
    responses.push(result);
  }

  return {
    summary: responses.map((item) => item.summary).filter(Boolean).join(" ").trim(),
    improvementSuggestions: [...new Set(responses.flatMap((item) => item.improvementSuggestions || []).filter(Boolean))].slice(0, 6),
    questionInsights: responses.flatMap((item) => item.questionInsights || []),
  };
};

const analyzeTest = async (payload) => {
  const attempt = await resolveAttemptPayload(payload);
  if (!attempt.questions.length) {
    const error = new Error("questions or testId is required");
    error.status = 400;
    throw error;
  }

  const analytics = computeAttemptAnalytics({
    questions: attempt.questions,
    answers: attempt.answers,
    exam: attempt.exam,
    perQuestionTimes: attempt.perQuestionTimes,
    totalTimeSeconds: attempt.timeTaken,
  });

  const aiOutput = await generateQuestionInsights(attempt.questions, attempt.answers);
  const questionInsightMap = new Map((aiOutput.questionInsights || []).map((item) => [String(item.questionId), item]));

  return {
    testId: attempt.testId,
    testTitle: attempt.testTitle,
    examId: attempt.examId,
    totalScore: analytics.summary.score,
    totalMarks: analytics.summary.totalMarks,
    accuracyPercentage: analytics.summary.accuracy,
    topicWisePerformance: analytics.topicPerformance,
    difficultyPerformance: analytics.difficultyPerformance,
    strongTopics: analytics.strongTopics,
    weakTopics: analytics.weakTopics,
    timeAnalysis: analytics.timeAnalysis,
    improvementSuggestions: aiOutput.improvementSuggestions || [],
    aiSummary: aiOutput.summary || "",
    questionBreakdown: analytics.snapshots.map((snapshot) => {
      const insight = questionInsightMap.get(String(snapshot.questionId));
      return {
        ...snapshot,
        solutionSteps: insight?.solutionSteps || [],
        simpleExplanation: insight?.simpleExplanation || snapshot.explanation || "",
        wrongOptionReasons: insight?.wrongOptionReasons || [],
      };
    }),
  };
};

const buildQuestionContextBlock = (context = {}) => {
  if (!context?.question && !context?.topic && !context?.questionImage) return null;

  return {
    question: stripHtml(context.question || ""),
    questionImage: context.questionImage || "",
    topic: context.topic || "",
    selectedAnswer: context.selectedAnswer,
    correctAnswer: context.correctAnswer,
    options: Array.isArray(context.options)
      ? context.options.map((option, index) => ({
          key: String.fromCharCode(65 + index),
          text: stripHtml(typeof option === "string" ? option : option?.text || ""),
        }))
      : [],
    explanation: stripHtml(context.explanation || ""),
    explanationImage: context.explanationImage || "",
  };
};

const formatQuestionContextForPrompt = (questionContext) => {
  if (!questionContext) {
    return "Question context: none provided.";
  }

  const optionsBlock =
    Array.isArray(questionContext.options) && questionContext.options.length
      ? questionContext.options.map((option) => `${option.key}. ${option.text}`).join("\n")
      : "No options provided.";

  const lines = [
    "Question context:",
    `Topic: ${questionContext.topic || "Unknown"}`,
    `Question: ${questionContext.question || "Not provided"}`,
  ];

  if (questionContext.questionImage) {
    lines.push("Note: This question includes an image. Please look at the attached image to understand the full question.");
  }

  lines.push(
    "Options:",
    optionsBlock,
    `Student selected: ${questionContext.selectedAnswer || "Not answered"}`,
    `Correct answer: ${questionContext.correctAnswer || "Not available"}`,
    `Official explanation: ${questionContext.explanation || "Not available"}`
  );

  return lines.join("\n");
};

const sanitizeChatAttachment = (attachment = {}, index = 0) => {
  const kind = ["image", "pdf", "text"].includes(String(attachment.kind || "").toLowerCase())
    ? String(attachment.kind).toLowerCase()
    : "text";
  const extractedText = truncateText(stripHtml(attachment.extractedText || ""), CHAT_ATTACHMENT_TEXT_LIMIT);
  const imageDataUrl =
    kind === "image" && typeof attachment.imageDataUrl === "string" && attachment.imageDataUrl.startsWith("data:image/")
      ? attachment.imageDataUrl
      : "";

  return {
    name: truncateText(stripHtml(attachment.name || `Attachment ${index + 1}`), 80) || `Attachment ${index + 1}`,
    kind,
    mimeType: truncateText(stripHtml(attachment.mimeType || ""), 80),
    size: Number(attachment.size || 0),
    extractedText,
    imageDataUrl,
  };
};

const buildAttachmentContextBlock = (context = {}) => {
  const attachments = Array.isArray(context?.attachments) ? context.attachments : [];
  if (!attachments.length) {
    return [];
  }

  return attachments
    .slice(0, CHAT_ATTACHMENT_COUNT_LIMIT)
    .map((attachment, index) => sanitizeChatAttachment(attachment, index));
};

const formatAttachmentContextForPrompt = (attachments = []) => {
  if (!attachments.length) {
    return "Attachments: none provided.";
  }

  return [
    "Attachments:",
    ...attachments.map((attachment, index) => {
      const descriptor = [
        `${index + 1}. ${attachment.name}`,
        attachment.kind.toUpperCase(),
        attachment.mimeType || "unknown type",
      ].join(" • ");

      if (!attachment.extractedText) {
        return `${descriptor}\nExtracted text: not available.`;
      }

      return `${descriptor}\nExtracted text:\n${attachment.extractedText}`;
    }),
  ].join("\n\n");
};

const serializeAttachmentMetadata = (attachments = []) =>
  attachments.map((attachment) => ({
    name: attachment.name,
    kind: attachment.kind,
    mimeType: attachment.mimeType,
    size: attachment.size,
  }));

const buildExamContextBlock = (context = {}) => {
  const hasSummary = context?.summary && typeof context.summary === "object";
  const hasQuestions = Array.isArray(context?.questions) && context.questions.length > 0;
  const hasTitle = Boolean(context?.testTitle);

  if (!hasSummary && !hasQuestions && !hasTitle) {
    return null;
  }

  return {
    testTitle: stripHtml(context.testTitle || "Practice Test"),
    summary: hasSummary
      ? {
          score: Number(context.summary.score || 0),
          totalMarks: Number(context.summary.totalMarks || 0),
          correct: Number(context.summary.correct || 0),
          partial: Number(context.summary.partial || 0),
          wrong: Number(context.summary.wrong || 0),
          unanswered: Number(context.summary.unanswered || 0),
          timeTakenSeconds: Number(context.summary.timeTakenSeconds || 0),
          totalQuestions: Number(context.summary.totalQuestions || 0),
        }
      : null,
    questions: hasQuestions
      ? context.questions.map((question, index) => ({
          order: Number(question.order || index + 1),
          subject: stripHtml(question.subject || "General"),
          questionType: stripHtml(question.questionType || "single"),
          result: stripHtml(question.result || ""),
          timeSpentSeconds: Number(question.timeSpentSeconds || 0),
          question: truncateText(question.question || "", 180),
          selectedAnswer: truncateText(question.selectedAnswer || "", 120),
          correctAnswer: truncateText(question.correctAnswer || "", 120),
          explanation: truncateText(question.explanation || "", 140),
        }))
      : [],
  };
};

const formatExamContextForPrompt = (examContext) => {
  if (!examContext) {
    return "Exam context: none provided.";
  }

  const summaryBlock = examContext.summary
    ? [
        `Test title: ${examContext.testTitle || "Practice Test"}`,
        `Score: ${examContext.summary.score}/${examContext.summary.totalMarks}`,
        `Correct: ${examContext.summary.correct}`,
        `Partial: ${examContext.summary.partial}`,
        `Wrong: ${examContext.summary.wrong}`,
        `Unanswered: ${examContext.summary.unanswered}`,
        `Total questions: ${examContext.summary.totalQuestions}`,
        `Time taken seconds: ${examContext.summary.timeTakenSeconds}`,
      ].join("\n")
    : `Test title: ${examContext.testTitle || "Practice Test"}`;

  const questionLines =
    Array.isArray(examContext.questions) && examContext.questions.length
      ? examContext.questions
          .map(
            (question) =>
              `Q${question.order} [${question.subject}] Result: ${question.result || "Unknown"} | Time: ${question.timeSpentSeconds || 0}s | Question: ${question.question || "Not available"} | Student: ${question.selectedAnswer || "Not answered"} | Correct: ${question.correctAnswer || "Not available"} | Explanation: ${question.explanation || "Not available"}`
          )
          .join("\n")
      : "No per-question exam context provided.";

  return [
    "Exam context:",
    summaryBlock,
    "Question list:",
    questionLines,
  ].join("\n");
};

const serializeChatMessage = (message = {}, index = 0) => ({
  id: `${message.role || "message"}-${message.createdAt || index}`,
  role: message.role === "assistant" ? "assistant" : "user",
  content: message.content || "",
  createdAt: message.createdAt || null,
  attachments: serializeAttachmentMetadata(Array.isArray(message.attachments) ? message.attachments : []),
});

const chatWithAssistant = async ({ userId, sessionId, message, context = {}, memory = true }) => {
  if (!message?.trim()) {
    const error = new Error("message is required");
    error.status = 400;
    throw error;
  }

  const resolvedSessionId = sessionId || crypto.randomUUID();
  const questionContext = buildQuestionContextBlock(context);
  const examContext = buildExamContextBlock(context);
  const attachmentContext = buildAttachmentContextBlock(context);
  const attachmentContextText = formatAttachmentContextForPrompt(attachmentContext);
  let chatSession = null;

  if (memory) {
    chatSession = await AIChatSession.findOne({ userId, sessionId: resolvedSessionId });
  }

  const recentMessages = (chatSession?.messages || []).slice(-8).map((item) => ({
    role: item.role,
    content: [
      {
        type: "input_text",
        text:
          item.role === "user" && item.contextText
            ? [item.content, item.contextText].filter(Boolean).join("\n\n")
            : item.content,
      },
    ],
  }));

  const response = await createStructuredResponse({
    model: DEFAULT_MODELS.chat,
    schemaName: "student_chat_response",
    schema: chatSchema,
    maxOutputTokens: 850,
    instructions: withMarkdownMathGuidance(
      "You are a patient study assistant for competitive exams. Explain answers simply, correct misconceptions directly, and prefer short paragraphs or bullets. Use the exam context for personal guidance and use the question context when the student asks about a specific question. If the student mentions a question number, answer from that question's data first. If a question has an attached image, analyze the image to understand the full question before answering. Do not mention that you are reading JSON.",
    ),
    input: [
      ...recentMessages,
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              `Student message: ${message.trim()}`,
              "",
              formatExamContextForPrompt(examContext),
              "",
              formatQuestionContextForPrompt(questionContext),
              "",
              attachmentContextText,
            ].join("\n"),
          },
          // Attach question image if present so Gemini can see it
          ...(questionContext?.questionImage
            ? [{ type: "image_url", url: questionContext.questionImage }]
            : []),
          // Attach explanation image if present
          ...(questionContext?.explanationImage
            ? [{ type: "image_url", url: questionContext.explanationImage }]
            : []),
          // Attach user-uploaded images so the model can inspect them directly
          ...attachmentContext
            .filter((attachment) => attachment.kind === "image" && attachment.imageDataUrl)
            .map((attachment) => ({ type: "image_url", url: attachment.imageDataUrl })),
        ],
      },
    ],
  });

  if (memory) {
    const nextSession =
      chatSession ||
      new AIChatSession({
        userId,
        sessionId: resolvedSessionId,
        messages: [],
      });

    nextSession.messages.push(
      {
        role: "user",
        content: message.trim(),
        contextText: attachmentContext.length ? attachmentContextText : "",
        attachments: serializeAttachmentMetadata(attachmentContext),
      },
      { role: "assistant", content: response.reply || "" }
    );
    if (!nextSession.title) {
      nextSession.title = truncateText(message.trim(), 60);
    }
    if (!nextSession.contextLabel && examContext?.testTitle) {
      nextSession.contextLabel = truncateText(examContext.testTitle, 80);
    }
    await nextSession.save();
  }

  return {
    sessionId: resolvedSessionId,
    reply: response.reply || "",
    suggestedPrompts: response.suggestedPrompts || [],
  };
};

const listChatSessions = async ({ userId }) => {
  const sessions = await AIChatSession.find({ userId })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(30)
    .lean();

  return sessions.map((session) => {
    const messages = Array.isArray(session.messages) ? session.messages : [];
    const lastMessage = messages[messages.length - 1];

    return {
      sessionId: session.sessionId,
      title: session.title || "New chat",
      contextLabel: session.contextLabel || "",
      createdAt: session.createdAt || null,
      updatedAt: session.updatedAt || null,
      messageCount: messages.length,
      lastMessagePreview: truncateText(lastMessage?.content || "", 100),
    };
  });
};

const getChatSession = async ({ userId, sessionId }) => {
  const session = await AIChatSession.findOne({ userId, sessionId }).lean();
  if (!session) {
    const error = new Error("Chat session not found");
    error.status = 404;
    throw error;
  }

  return {
    sessionId: session.sessionId,
    title: session.title || "New chat",
    contextLabel: session.contextLabel || "",
    createdAt: session.createdAt || null,
    updatedAt: session.updatedAt || null,
    messages: (session.messages || []).map((message, index) => serializeChatMessage(message, index)),
  };
};

const parseQuestionsFromExtractedText = async ({ extractedText }) => {
  if (!extractedText?.trim()) {
    const error = new Error("No OCR text could be extracted from the image");
    error.status = 400;
    throw error;
  }

  const response = await createStructuredResponse({
    model: DEFAULT_MODELS.parser,
    schemaName: "ocr_parsed_questions",
    schema: parsedQuestionsSchema,
    maxOutputTokens: 2200,
    instructions:
      "Convert OCR text into exam questions. Return only the questions you can confidently parse. Normalize option labels into A, B, C, D. If no answer key exists in the OCR text, set correctAnswer to an empty string.",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: extractedText,
          },
        ],
      },
    ],
  });

  return response.questions || [];
};

const buildAnalyticsSummary = async (analytics) =>
  createStructuredResponse({
    model: DEFAULT_MODELS.summary,
    schemaName: "analytics_summary",
    schema: studyPlanSchema,
    maxOutputTokens: 500,
    instructions: withMarkdownMathGuidance(
      "You are summarizing a student's exam analytics. Keep the summary short, direct, and student-friendly. The studyPlan array should contain 3 to 5 concrete next actions.",
    ),
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              averageAccuracy: analytics.averageAccuracy,
              strongTopics: analytics.strongTopics,
              weakTopics: analytics.weakTopics,
              weakestTopicsRanking: analytics.weakestTopicsRanking,
              progressOverTime: analytics.progressOverTime.slice(-5),
            }),
          },
        ],
      },
    ],
  });

const getStudentAnalytics = async ({ studentId }) => {
  const attempts = await TestAttempt.find({ userId: studentId, status: "COMPLETED" })
    .sort({ completedAt: 1, startedAt: 1 })
    .lean();

  const analytics = computeStudentAnalytics(attempts);
  const aiSummary = analytics.attemptCount ? await buildAnalyticsSummary(analytics) : { summary: "", studyPlan: [] };

  return {
    ...analytics,
    aiSummary: aiSummary.summary || "",
    aiStudyPlan: aiSummary.studyPlan || [],
  };
};

const getRecommendations = async ({ studentId, analytics: providedAnalytics = null }) => {
  const analytics = providedAnalytics || (await getStudentAnalytics({ studentId }));
  const seed = buildRecommendationSeed(analytics);

  const aiPlan = await createStructuredResponse({
    model: DEFAULT_MODELS.summary,
    schemaName: "recommendations_plan",
    schema: studyPlanSchema,
    maxOutputTokens: 500,
    instructions: withMarkdownMathGuidance(
      "Generate a short personalized study summary and a compact study plan. Focus on revision topics, practice count, and the right difficulty progression.",
    ),
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              averageAccuracy: analytics.averageAccuracy,
              weakTopics: analytics.weakTopics,
              strongTopics: analytics.strongTopics,
              recommendationSeed: seed,
            }),
          },
        ],
      },
    ],
  });

  return {
    topicsToRevise: seed.topicsToRevise,
    practiceSuggestions: seed.practiceSuggestions,
    difficultyAdjustment: seed.difficultyAdjustment,
    studyPlan: aiPlan.studyPlan || [],
    summary: aiPlan.summary || "",
  };
};

const generateQuestions = async ({ topic, difficulty = "medium", numberOfQuestions = 5 }) => {
  if (!topic?.trim()) {
    const error = new Error("topic is required");
    error.status = 400;
    throw error;
  }

  const response = await createStructuredResponse({
    model: DEFAULT_MODELS.questions,
    schemaName: "generated_questions",
    schema: generatedQuestionsSchema,
    maxOutputTokens: 2600,
    instructions: withMarkdownMathGuidance(
      "Generate exam-style multiple-choice questions with exactly four options labeled A to D. Keep one correct answer only. Difficulty must match the request. Explanations should be concise and useful for review.",
    ),
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              topic: topic.trim(),
              difficulty,
              numberOfQuestions: Math.max(1, Math.min(20, Number(numberOfQuestions || 5))),
            }),
          },
        ],
      },
    ],
  });

  return response.questions || [];
};

const predictStudentPerformance = async ({ studentId, analytics: providedAnalytics = null }) => {
  const analytics = providedAnalytics || (await getStudentAnalytics({ studentId }));
  const benchmarkAttempts = await TestAttempt.find({ status: "COMPLETED" }).select("accuracy").lean();
  const prediction = buildPrediction({
    analytics,
    benchmarkAccuracies: benchmarkAttempts.map((item) => Number(item.accuracy || 0)),
  });

  const aiNarrative = await createStructuredResponse({
    model: DEFAULT_MODELS.summary,
    schemaName: "prediction_narrative",
    schema: predictionNarrativeSchema,
    maxOutputTokens: 220,
    instructions: withMarkdownMathGuidance(
      "Write one short prediction insight for a student. Mention likely next-test performance and the biggest improvement lever.",
    ),
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              currentAccuracy: prediction.currentAccuracy,
              expectedAccuracy: prediction.expectedAccuracy,
              futureScoreImprovement: prediction.futureScoreImprovement,
              probabilityOfImprovement: prediction.probabilityOfImprovement,
              weakTopics: analytics.weakTopics,
              strongTopics: analytics.strongTopics,
            }),
          },
        ],
      },
    ],
  });

  return {
    ...prediction,
    insight: aiNarrative.insight || "",
  };
};

module.exports = {
  analyzeTest,
  chatWithAssistant,
  listChatSessions,
  getChatSession,
  parseQuestionsFromExtractedText,
  getStudentAnalytics,
  getRecommendations,
  generateQuestions,
  predictStudentPerformance,
};
