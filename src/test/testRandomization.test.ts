import { describe, expect, it } from "vitest";
import type { BaseTestQuestion } from "@/lib/testRandomization";
import {
  buildOriginalAnswersPayload,
  buildOriginalQuestionTimesPayload,
  prepareTestQuestions,
  reorderQuestionUsingSavedOptions,
} from "@/lib/testRandomization";

const baseQuestions: BaseTestQuestion[] = [
  {
    id: "q1",
    question: "Question 1",
    questionType: "single",
    options: [
      { text: "A1" },
      { text: "B1" },
      { text: "C1" },
      { text: "D1" },
    ],
    correctAnswer: 2,
    correctAnswers: [2],
    writtenAnswer: "",
    subject: "Physics",
    explanation: "",
  },
  {
    id: "q2",
    question: "Question 2",
    questionType: "multiple",
    options: [
      { text: "A2" },
      { text: "B2" },
      { text: "C2" },
      { text: "D2" },
    ],
    correctAnswer: 1,
    correctAnswers: [1, 3],
    writtenAnswer: "",
    subject: "Chemistry",
    explanation: "",
  },
];

describe("testRandomization", () => {
  it("keeps a saved question and option order stable", () => {
    const prepared = prepareTestQuestions(baseQuestions, { shuffleQuestions: true, shuffleOptions: true }, {
      questionOrder: ["q2", "q1"],
      optionOrderByQuestionId: {
        q1: [3, 2, 1, 0],
        q2: [2, 3, 1, 0],
      },
    });

    expect(prepared.questionOrder).toEqual(["q2", "q1"]);
    expect(prepared.questions[0].id).toBe("q2");
    expect(prepared.questions[1].id).toBe("q1");
    expect(prepared.questions[1].options.map((option) => option.originalIndex)).toEqual([3, 2, 1, 0]);
    expect(prepared.questions[1].correctAnswer).toBe(1);
    expect(prepared.questions[0].correctAnswers).toEqual([1, 2]);
  });

  it("maps shuffled answers and times back to the original backend order", () => {
    const prepared = prepareTestQuestions(baseQuestions, {}, {
      questionOrder: ["q2", "q1"],
      optionOrderByQuestionId: {
        q1: [3, 2, 1, 0],
        q2: [2, 3, 1, 0],
      },
    });

    const answers = {
      0: [1, 2],
      1: 1,
    };

    expect(buildOriginalAnswersPayload(prepared.questions, answers)).toEqual({
      0: 2,
      1: [1, 3],
    });

    expect(buildOriginalQuestionTimesPayload(prepared.questions, { 0: 18, 1: 31 })).toEqual([31, 18]);
  });

  it("reapplies a saved option order for result hydration", () => {
    const reordered = reorderQuestionUsingSavedOptions(baseQuestions[0], [3, 2, 1, 0], 0);
    expect(reordered.options.map((option) => option.text)).toEqual(["D1", "C1", "B1", "A1"]);
    expect(reordered.correctAnswer).toBe(1);
  });
});
