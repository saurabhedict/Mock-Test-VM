import { describe, expect, it } from "vitest";
import {
  calculateInstructionTotalMarks,
  getExpectedInstructionSummary,
  resolveInstructionTotalMarks,
} from "@/lib/testInstructionMarks";
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

  it("uses the expected exam pattern total for a full-length selected paper without explicit overrides", () => {
    const examSubjects = [
      { name: "Physics", questionCount: 50, marksPerQuestion: 1 },
      { name: "Chemistry", questionCount: 50, marksPerQuestion: 1 },
      { name: "Mathematics", questionCount: 50, marksPerQuestion: 2 },
    ];

    const questions = [
      ...Array.from({ length: 51 }, (_, index) => makeQuestion(`p-${index}`, "Physics")),
      ...Array.from({ length: 50 }, (_, index) => makeQuestion(`c-${index}`, "Chemistry")),
      ...Array.from({ length: 49 }, (_, index) => makeQuestion(`m-${index}`, "Mathematics")),
    ];

    expect(
      resolveInstructionTotalMarks({
        questions,
        examSubjects,
        selectedSubjects: ["Physics", "Chemistry", "Mathematics"],
        fallbackTotalMarks: 200,
        hasExplicitMarkOverrides: false,
      }),
    ).toBe(200);
  });

  it("uses live question-derived marks when a selected paper is incomplete", () => {
    const examSubjects = [
      { name: "Physics", questionCount: 50, marksPerQuestion: 1 },
      { name: "Chemistry", questionCount: 50, marksPerQuestion: 1 },
      { name: "Biology", questionCount: 100, marksPerQuestion: 1 },
    ];

    const questions = [
      ...Array.from({ length: 51 }, (_, index) => makeQuestion(`p-${index}`, "Physics")),
      ...Array.from({ length: 46 }, (_, index) => makeQuestion(`c-${index}`, "Chemistry", index < 5 ? 0.75 : 1)),
    ];

    expect(
      resolveInstructionTotalMarks({
        questions,
        examSubjects,
        selectedSubjects: ["Physics", "Chemistry", "Biology"],
        fallbackTotalMarks: 200,
        hasExplicitMarkOverrides: true,
      }),
    ).toBe(97);
  });

  it("builds the expected paper summary from the selected exam subjects", () => {
    const summary = getExpectedInstructionSummary(
      [
        { name: "Physics", questionCount: 50, marksPerQuestion: 1 },
        { name: "Chemistry", questionCount: 50, marksPerQuestion: 1 },
        { name: "Mathematics", questionCount: 50, marksPerQuestion: 2 },
      ],
      ["Physics", "Mathematics"],
    );

    expect(summary).toEqual({ totalQuestions: 100, totalMarks: 150 });
  });
});
