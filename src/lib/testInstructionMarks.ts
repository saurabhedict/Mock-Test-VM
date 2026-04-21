import { isSameSubject, type ExamSubjectMarkingRule } from "@/lib/scoring";
import type { BaseTestQuestion } from "@/lib/testRandomization";

export interface ExamInstructionSubjectRule extends ExamSubjectMarkingRule {
  questionCount?: number;
}

const toFiniteNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getInstructionQuestionMarks = (
  question: Pick<BaseTestQuestion, "subject" | "marksPerQuestion">,
  subjects: ExamSubjectMarkingRule[] = [],
) => {
  const subjectRule = subjects.find((subject) => isSameSubject(subject.name, question.subject));

  // The instruction page should reflect the exam blueprint's published marking
  // scheme, while still falling back to question-level marks for uncategorized items.
  if (subjectRule) {
    return toFiniteNumber(subjectRule.marksPerQuestion, 1);
  }

  return toFiniteNumber(question.marksPerQuestion, 1);
};

export const calculateInstructionTotalMarks = (
  questions: Array<Pick<BaseTestQuestion, "subject" | "marksPerQuestion">>,
  subjects: ExamSubjectMarkingRule[] = [],
) => questions.reduce((sum, question) => sum + getInstructionQuestionMarks(question, subjects), 0);

const resolveSelectedExamSubjects = (
  examSubjects: ExamInstructionSubjectRule[] = [],
  selectedSubjects: string[] = [],
) => {
  if (selectedSubjects.length === 0) {
    return examSubjects;
  }

  return examSubjects.filter((examSubject) =>
    selectedSubjects.some((selectedSubject) => isSameSubject(examSubject.name, selectedSubject)),
  );
};

export const getExpectedInstructionSummary = (
  examSubjects: ExamInstructionSubjectRule[] = [],
  selectedSubjects: string[] = [],
) => {
  const matchedSubjects = resolveSelectedExamSubjects(examSubjects, selectedSubjects);
  if (matchedSubjects.length === 0) {
    return null;
  }

  return matchedSubjects.reduce(
    (summary, subject) => ({
      totalQuestions: summary.totalQuestions + toFiniteNumber(subject.questionCount, 0),
      totalMarks: summary.totalMarks + toFiniteNumber(subject.questionCount, 0) * toFiniteNumber(subject.marksPerQuestion, 1),
    }),
    { totalQuestions: 0, totalMarks: 0 },
  );
};

export const resolveInstructionTotalMarks = ({
  questions,
  examSubjects = [],
  selectedSubjects = [],
  fallbackTotalMarks = 0,
  hasExplicitMarkOverrides = false,
}: {
  questions: Array<Pick<BaseTestQuestion, "subject" | "marksPerQuestion">>;
  examSubjects?: ExamInstructionSubjectRule[];
  selectedSubjects?: string[];
  fallbackTotalMarks?: number;
  hasExplicitMarkOverrides?: boolean;
}) => {
  const dynamicTotalMarks = calculateInstructionTotalMarks(questions, examSubjects);
  const expectedSummary = getExpectedInstructionSummary(examSubjects, selectedSubjects);

  if (
    expectedSummary &&
    !hasExplicitMarkOverrides &&
    questions.length === expectedSummary.totalQuestions
  ) {
    return expectedSummary.totalMarks;
  }

  return dynamicTotalMarks || fallbackTotalMarks || expectedSummary?.totalMarks || 0;
};
