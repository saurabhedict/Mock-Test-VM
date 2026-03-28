import { describe, expect, it } from "vitest";
import { isCorrectAnswer } from "@/lib/scoring";

describe("written answer scoring", () => {
  it("matches rich-text formatted correct answers against plain student input", () => {
    expect(
      isCorrectAnswer(
        {
          questionType: "written",
          writtenAnswer: "<p><strong>12</strong></p>",
        },
        "12",
      ),
    ).toBe(true);
  });

  it("matches math answers even when the stored answer is wrapped in math delimiters", () => {
    expect(
      isCorrectAnswer(
        {
          questionType: "written",
          writtenAnswer: "<div>$$\\frac{1}{2}$$</div>",
        },
        "\\frac{1}{2}",
      ),
    ).toBe(true);
  });
});
