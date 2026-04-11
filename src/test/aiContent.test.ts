import { describe, expect, it } from "vitest";
import { normalizeAiResponse } from "@/lib/aiContent";

describe("normalizeAiResponse", () => {
  it("converts common LaTeX delimiters into markdown-friendly math fences", () => {
    const input = "Use \\(x^2 + y^2\\) for distance and solve \\[\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}\\].";
    const output = normalizeAiResponse(input);

    expect(output).toContain("$x^2 + y^2$");
    expect(output).toContain("$$\n\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}\n$$");
  });

  it("turns fenced latex blocks into display math and preserves non-math code fences", () => {
    const input = [
      "```latex",
      "\\int_0^1 x^2\\,dx = \\frac{1}{3}",
      "```",
      "",
      "```ts",
      "const area = Math.PI * r ** 2;",
      "```",
    ].join("\n");

    const output = normalizeAiResponse(input);

    expect(output).toContain("$$\n\\int_0^1 x^2\\,dx = \\frac{1}{3}\n$$");
    expect(output).toContain("```ts\nconst area = Math.PI * r ** 2;\n```");
  });

  it("wraps standalone math-like lines but leaves regular prose untouched", () => {
    const input = ["x^2 + 2x + 1 = 0", "", "Focus on quadratic identities before the next test."].join("\n");
    const output = normalizeAiResponse(input);

    expect(output).toContain("$$\nx^2 + 2x + 1 = 0\n$$");
    expect(output).toContain("Focus on quadratic identities before the next test.");
  });

  it("fixes double-escaped latex commands and delimiters from structured AI responses", () => {
    const input = "Solve \\\\(x^2 + 1\\\\) and use \\\\frac{1}{2} in the next step.";
    const output = normalizeAiResponse(input);

    expect(output).toContain("$x^2 + 1$");
    expect(output).toContain("\\frac{1}{2}");
  });
});
