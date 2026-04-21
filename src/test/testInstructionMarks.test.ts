import { describe, expect, it } from "vitest";
import { calculateInstructionTotalMarks } from "@/lib/testInstructionMarks";
import type { ExamSubjectMarkingRule } from "@/lib/scoring";
import type { BaseTestQuestion } from "@/lib/testRandomization";

const makeQuestion = (id: string, subject: string, marksPerQuestion?: number): BaseTestQuestion => ({
  id,
  question: `${subject} question ${id}`,
  questionType: "single",
  options: [{ text: "A" }, { text: "B" }, { text: "C" }, { text: "D" }],
  correctAnswer: 0,
  correctAnswers: [0],
  writtenAnswer: "",
  subject,
  explanation: "",
  marksPerQuestion,
});

describe("calculateInstructionTotalMarks", () => {
  it("uses subject rules for PCM-style papers even when a question carries a stale override", () => {
    const subjects: ExamSubjectMarkingRule[] = [
      { name: "Physics", marksPerQuestion: 1 },
      { name: "Chemistry", marksPerQuestion: 1 },
      { name: "Mathematics", marksPerQuestion: 2 },
    ];

    const questions = [
      ...Array.from({ length: 50 }, (_, index) => makeQuestion(`p-${index}`, "Physics")),
      ...Array.from({ length: 50 }, (_, index) => makeQuestion(`c-${index}`, "Chemistry")),
      ...Array.from({ length: 49 }, (_, index) => makeQuestion(`m-${index}`, "Mathematics")),
      makeQuestion("m-stale", "Mathematics", 1),
    ];

    expect(calculateInstructionTotalMarks(questions, subjects)).toBe(200);
  });

  it("uses live question count with subject defaults for PCB-style papers", () => {
    const subjects: ExamSubjectMarkingRule[] = [
      { name: "Physics", marksPerQuestion: 1 },
      { name: "Chemistry", marksPerQuestion: 1 },
      { name: "Biology", marksPerQuestion: 1 },
    ];

    const questions = [
      ...Array.from({ length: 32 }, (_, index) => makeQuestion(`p-${index}`, "Physics")),
      ...Array.from({ length: 32 }, (_, index) => makeQuestion(`c-${index}`, "Chemistry")),
      ...Array.from({ length: 32 }, (_, index) => makeQuestion(`b-${index}`, "Biology")),
      makeQuestion("b-stale", "Biology", 0.5),
    ];

    expect(calculateInstructionTotalMarks(questions, subjects)).toBe(97);
  });

  it("falls back to question-level marks when no subject rule exists", () => {
    const questions = [
      makeQuestion("g-1", "General", 4),
      makeQuestion("g-2", "General", 2),
      makeQuestion("g-3", "General"),
    ];

    expect(calculateInstructionTotalMarks(questions, [])).toBe(7);
  });
});
