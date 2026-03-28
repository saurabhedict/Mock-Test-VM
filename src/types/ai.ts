export interface TopicPerformance {
  topic: string;
  total: number;
  attempted: number;
  correct: number;
  partial: number;
  wrong: number;
  unanswered: number;
  accuracy: number;
  averageScore: number;
  averageTimeSeconds: number;
}

export interface DifficultyPerformance {
  difficulty: string;
  total: number;
  attempted: number;
  correct: number;
  partial: number;
  wrong: number;
  unanswered: number;
  accuracy: number;
  averageScore: number;
  averageTimeSeconds: number;
}

export interface TimingQuestion {
  questionId: string;
  order: number;
  topic: string;
  verdict: string;
  timeSpentSeconds: number;
  questionPreview: string;
}

export interface QuestionInsightReason {
  optionKey: string;
  reason: string;
}

export interface QuestionBreakdown {
  questionId: string;
  order: number;
  subject: string;
  difficulty: string;
  questionType: string;
  question: string;
  explanation: string;
  verdict: string;
  score: number;
  marks: number;
  negativeMarks: number;
  timeSpentSeconds: number;
  solutionSteps: string[];
  simpleExplanation: string;
  wrongOptionReasons: QuestionInsightReason[];
}

export interface TestAnalysis {
  testId: string;
  testTitle: string;
  examId: string;
  totalScore: number;
  totalMarks: number;
  accuracyPercentage: number;
  topicWisePerformance: TopicPerformance[];
  difficultyPerformance: DifficultyPerformance[];
  strongTopics: string[];
  weakTopics: string[];
  timeAnalysis: {
    totalTimeSeconds: number;
    averageTimeSeconds: number;
    slowQuestions: TimingQuestion[];
    fastQuestions: TimingQuestion[];
  };
  improvementSuggestions: string[];
  aiSummary: string;
  questionBreakdown: QuestionBreakdown[];
}

export interface StudentAnalytics {
  attemptCount: number;
  averageAccuracy: number;
  averageScore: number;
  latestAttempt: {
    attemptId: string;
    testTitle: string;
    accuracy: number;
    score: number;
    totalMarks: number;
    timeTakenSeconds: number;
  } | null;
  topicPerformance: TopicPerformance[];
  difficultyPerformance: DifficultyPerformance[];
  weakestTopicsRanking: TopicPerformance[];
  progressOverTime: Array<{
    attemptId: string;
    date: string;
    testTitle: string;
    accuracy: number;
    score: number;
    totalMarks: number;
  }>;
  timeSpentPerQuestion: TimingQuestion[];
  strongTopics: string[];
  weakTopics: string[];
  aiSummary: string;
  aiStudyPlan: string[];
}

export interface Recommendations {
  topicsToRevise: string[];
  practiceSuggestions: string[];
  difficultyAdjustment: "easy" | "medium" | "hard";
  studyPlan: string[];
  summary: string;
}

export interface Prediction {
  currentAccuracy: number;
  expectedAccuracy: number;
  futureScoreImprovement: number;
  probabilityOfImprovement: number;
  expectedRank: number;
  cohortSize: number;
  insight: string;
}
