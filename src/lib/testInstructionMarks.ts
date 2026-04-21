import { isSameSubject, type ExamSubjectMarkingRule } from "@/lib/scoring";
import type { BaseTestQuestion } from "@/lib/testRandomization";

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
