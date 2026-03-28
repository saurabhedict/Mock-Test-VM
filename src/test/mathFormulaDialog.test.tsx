import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MathFormulaDialog from "@/components/MathFormulaDialog";

vi.mock("@/components/FormattedContent", () => ({
  default: ({ html }: { html?: string }) => <div data-testid="math-preview">{html}</div>,
}));

vi.mock("@/lib/mathlive", () => ({
  ensureMathLive: vi.fn(async () => {
    if (!window.customElements.get("math-field")) {
      class FakeMathField extends HTMLElement {
        value = "";

        setValue(nextValue = "") {
          this.value = nextValue;
        }

        insert(nextValue = "") {
          this.value += String(nextValue);
          return true;
        }

        executeCommand(command: string | [string, ...unknown[]]) {
          if (Array.isArray(command) && command[0] === "insert") {
            this.value += String(command[1] || "");
          }

          return true;
        }

        focus() {}

        blur() {}
      }

      window.customElements.define("math-field", FakeMathField);
    }
  }),
}));

describe("MathFormulaDialog", () => {
  beforeEach(() => {
    window.mathVirtualKeyboard = {
      visible: true,
      hide: vi.fn(() => {
        if (window.mathVirtualKeyboard) {
          window.mathVirtualKeyboard.visible = false;
        }
      }),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("hides the virtual keyboard when the dialog closes after inserting", async () => {
    const handleInsert = vi.fn();
    const handleOpenChange = vi.fn();

    render(<MathFormulaDialog open onOpenChange={handleOpenChange} onInsert={handleInsert} />);

    const latexField = await screen.findByRole("textbox");
    fireEvent.change(latexField, { target: { value: "x^2" } });
    fireEvent.click(screen.getByRole("button", { name: "Insert Block" }));

    expect(handleInsert).toHaveBeenCalledWith("x^2", "block");
    expect(handleOpenChange).toHaveBeenCalledWith(false);
    expect(window.mathVirtualKeyboard?.hide).toHaveBeenCalled();
    expect(window.mathVirtualKeyboard?.visible).toBe(false);
  });

  it("hides the virtual keyboard on unmount", async () => {
    const { unmount } = render(<MathFormulaDialog open onOpenChange={vi.fn()} onInsert={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Fraction" })).toBeEnabled();
    });

    unmount();

    expect(window.mathVirtualKeyboard?.hide).toHaveBeenCalled();
  });

  it("keeps the dialog open and updates latex when a formula snippet is inserted", async () => {
    const handleInsert = vi.fn();
    const handleOpenChange = vi.fn();

    render(<MathFormulaDialog open onOpenChange={handleOpenChange} onInsert={handleInsert} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Fraction" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Fraction" }));

    await waitFor(() => {
      expect(screen.getByRole("textbox")).toHaveValue("\\frac{#?}{#?}");
    });

    expect(handleOpenChange).not.toHaveBeenCalled();
    expect(handleInsert).not.toHaveBeenCalled();
  });
});
