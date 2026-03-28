export interface DynamicExamSubject {
  name: string;
  code?: string;
  questionCount: number;
  marksPerQuestion: number;
  negativeMarksPerQuestion?: number;
}

export interface DynamicExam {
  _id: string;
  examId: string;
  slug: string;
  examName: string;
  shortName: string;
  description: string;
  icon: string;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  subjects: DynamicExamSubject[];
  isActive?: boolean;
}

export interface ExamCatalogItem {
  examId: string;
  examName: string;
  shortName: string;
  description: string;
  icon: string;
  subjects: Array<{
    subjectId: string;
    subjectName: string;
    totalQuestions: number;
    marksPerQuestion: number;
    negativeMarksPerQuestion?: number;
    papers?: number;
    duration?: number;
  }>;
  fullLengthTests: Array<{
    testId: string;
    testName: string;
    subjects: {
      subjectName: string;
      questions: number;
      marksPerQuestion: number;
      negativeMarksPerQuestion?: number;
    }[];
    totalQuestions: number;
    totalMarks: number;
    papers: number;
    duration?: number;
  }>;
  durationMinutes?: number;
  totalQuestions?: number;
  totalMarks?: number;
}

export const mapDynamicExamToCatalog = (exam: DynamicExam): ExamCatalogItem => ({
  examId: exam.examId,
  examName: exam.examName,
  shortName: exam.shortName,
  description: exam.description,
  icon: exam.icon || "📝",
  subjects: exam.subjects.map((subject) => ({
    subjectId: subject.code || subject.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    subjectName: subject.name,
    totalQuestions: subject.questionCount,
    marksPerQuestion: subject.marksPerQuestion,
    negativeMarksPerQuestion: subject.negativeMarksPerQuestion ?? 0,
    papers: 1,
    duration: exam.durationMinutes,
  })),
  fullLengthTests: exam.subjects.length > 1 ? [
    {
      testId: "full-length",
      testName: `${exam.shortName} Full Length Test`,
      subjects: exam.subjects.map((subject) => ({
        subjectName: subject.name,
        questions: subject.questionCount,
        marksPerQuestion: subject.marksPerQuestion,
        negativeMarksPerQuestion: subject.negativeMarksPerQuestion ?? 0,
      })),
      totalQuestions: exam.totalQuestions,
      totalMarks: exam.totalMarks,
      papers: 1,
      duration: exam.durationMinutes,
    },
  ] : [],
  durationMinutes: exam.durationMinutes,
  totalQuestions: exam.totalQuestions,
  totalMarks: exam.totalMarks,
});

export const mergeExamCatalog = (dynamicExams: DynamicExam[] = []): ExamCatalogItem[] => {
  return dynamicExams.map(mapDynamicExamToCatalog);
};

export const findExamInCatalog = (
  examId: string,
  dynamicExams: DynamicExam[] = []
): ExamCatalogItem | undefined => mergeExamCatalog(dynamicExams).find((exam) => exam.examId === examId);
