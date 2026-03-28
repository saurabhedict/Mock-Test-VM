import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RichTextEditor from "@/components/RichTextEditor";

vi.mock("@/components/FormattedContent", () => ({
  default: ({ html }: { html?: string }) => <div data-testid="formatted-content">{html}</div>,
}));

vi.mock("@/components/MathFormulaDialog", () => ({
  default: ({
    open,
    onOpenChange,
    onInsert,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onInsert: (latex: string, mode: "inline" | "block") => void;
  }) =>
    open ? (
      <div data-testid="mock-math-dialog">
        <button type="button" onClick={() => onInsert("x^2", "inline")}>
          Insert Inline Formula
        </button>
        <button type="button" onClick={() => onInsert("\\frac{1}{2}", "block")}>
          Insert Block Formula
        </button>
        <button type="button" onClick={() => onOpenChange(false)}>
          Close Math Dialog
        </button>
      </div>
    ) : null,
}));

const setCaretToEnd = (editor: HTMLElement) => {
  const selection = window.getSelection();
  const textNode = editor.firstChild;

  if (!selection || !textNode) {
    return;
  }

  const range = document.createRange();
  const offset = textNode.textContent?.length ?? 0;

  range.setStart(textNode, offset);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
};

function ControlledEditor() {
  const [value, setValue] = useState("Alpha");

  return (
    <>
      <RichTextEditor value={value} onChange={setValue} showPreview={false} />
      <div data-testid="editor-value">{value}</div>
    </>
  );
}

describe("RichTextEditor math insertion", () => {
  it("restores the saved selection and supports multiple formula inserts", async () => {
    const { container } = render(<ControlledEditor />);
    const editor = container.querySelector("[contenteditable='true']") as HTMLElement | null;

    expect(editor).not.toBeNull();

    await waitFor(() => {
      expect(editor?.innerHTML).toContain("Alpha");
    });

    setCaretToEnd(editor as HTMLElement);

    fireEvent.mouseDown(screen.getByRole("button", { name: "Math" }));
    fireEvent.click(screen.getByRole("button", { name: "Insert Inline Formula" }));

    await waitFor(() => {
      expect(screen.getByTestId("editor-value")).toHaveTextContent("Alpha$x^2$");
    });

    fireEvent.mouseDown(screen.getByRole("button", { name: "Math" }));
    fireEvent.click(screen.getByRole("button", { name: "Insert Block Formula" }));

    await waitFor(() => {
      expect(screen.getByTestId("editor-value").textContent).toContain("Alpha$x^2$");
      expect(screen.getByTestId("editor-value").textContent).toContain("$$\\frac{1}{2}$$");
    });
  });
});
