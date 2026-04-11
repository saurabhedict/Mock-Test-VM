import { useDeferredValue, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import FormattedContent from "@/components/FormattedContent";
import MathFormulaDialog from "@/components/MathFormulaDialog";
import { cn } from "@/lib/utils";
import { isRichTextBlank, normalizeRichText, plainTextToHtml, sanitizeRichText } from "@/lib/richText";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  editorClassName?: string;
  previewClassName?: string;
  showPreview?: boolean;
}

const TOOLBAR_ACTIONS = [
  { label: "B", command: "bold" },
  { label: "I", command: "italic" },
  { label: "U", command: "underline" },
  { label: "x²", command: "superscript" },
  { label: "x₂", command: "subscript" },
  { label: "• List", command: "insertUnorderedList" },
  { label: "1. List", command: "insertOrderedList" },
] as const;

interface SerializedSelection {
  startPath: number[];
  startOffset: number;
  endPath: number[];
  endOffset: number;
}

const getNodePath = (root: Node, target: Node) => {
  const path: number[] = [];
  let current: Node | null = target;

  while (current && current !== root) {
    const parent = current.parentNode;
    if (!parent) return null;

    const index = Array.prototype.indexOf.call(parent.childNodes, current);
    if (index < 0) return null;

    path.unshift(index);
    current = parent;
  }

  return current === root ? path : null;
};

const resolveNodePath = (root: Node, path: number[]) => {
  let current: Node | null = root;

  for (const index of path) {
    current = current?.childNodes.item(index) || null;
    if (!current) return null;
  }

  return current;
};

const clampOffset = (node: Node, offset: number) => {
  if (node.nodeType === Node.TEXT_NODE) {
    return Math.min(offset, node.textContent?.length ?? 0);
  }

  return Math.min(offset, node.childNodes.length);
};

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  editorClassName,
  previewClassName,
  showPreview = true,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<SerializedSelection | null>(null);
  const normalizedValue = normalizeRichText(value);
  const isBlank = isRichTextBlank(value);
  const deferredPreviewValue = useDeferredValue(value);
  const [showFormulaDialog, setShowFormulaDialog] = useState(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (document.activeElement === editor) return;
    if (editor.innerHTML !== normalizedValue) {
      editor.innerHTML = normalizedValue;
    }
  }, [normalizedValue]);

  const emitChange = (sanitize = false) => {
    const editor = editorRef.current;
    if (!editor) return;

    const nextValue = sanitize ? sanitizeRichText(editor.innerHTML) : editor.innerHTML;
    if (sanitize && editor.innerHTML !== nextValue) {
      editor.innerHTML = nextValue;
    }
    onChange(nextValue);
  };

  const saveSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;

    const startPath = getNodePath(editor, range.startContainer);
    const endPath = getNodePath(editor, range.endContainer);
    if (!startPath || !endPath) return;

    selectionRef.current = {
      startPath,
      startOffset: range.startOffset,
      endPath,
      endOffset: range.endOffset,
    };
  };

  const restoreSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    const serializedSelection = selectionRef.current;

    if (!editor || !selection || !serializedSelection) return false;

    const startNode = resolveNodePath(editor, serializedSelection.startPath);
    const endNode = resolveNodePath(editor, serializedSelection.endPath);
    if (!startNode || !endNode) return false;

    try {
      const range = document.createRange();
      range.setStart(startNode, clampOffset(startNode, serializedSelection.startOffset));
      range.setEnd(endNode, clampOffset(endNode, serializedSelection.endOffset));
      selection.removeAllRanges();
      selection.addRange(range);
      return true;
    } catch {
      return false;
    }
  };

  const insertHtmlAtCursor = (html: string) => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection) return;

    let range: Range | null = null;

    if (selection.rangeCount > 0) {
      const currentRange = selection.getRangeAt(0);
      if (editor.contains(currentRange.commonAncestorContainer)) {
        range = currentRange;
      }
    }

    if (!range && restoreSelection() && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    }

    if (!range) {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    range.deleteContents();

    const temp = document.createElement("div");
    temp.innerHTML = html;
    const fragment = document.createDocumentFragment();
    let lastNode: ChildNode | null = null;

    while (temp.firstChild) {
      lastNode = temp.firstChild;
      fragment.appendChild(temp.firstChild);
    }

    range.insertNode(fragment);

    if (lastNode) {
      const nextRange = document.createRange();
      nextRange.setStartAfter(lastNode);
      nextRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(nextRange);
      saveSelection();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    const nextHtml = html ? sanitizeRichText(html) : plainTextToHtml(text);

    if (!nextHtml) return;

    editorRef.current?.focus();
    insertHtmlAtCursor(nextHtml);
    emitChange(true);
  };

  const applyCommand = (command: string) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false);
    emitChange(true);
    saveSelection();
  };

  const insertFormula = (latex: string, mode: "inline" | "block") => {
    editorRef.current?.focus();
    const formatted =
      mode === "block"
        ? `<div>${plainTextToHtml(`$$${latex}$$`)}</div>`
        : plainTextToHtml(`$${latex}$`);
    insertHtmlAtCursor(formatted);
    emitChange(true);
  };

  const clearEditor = () => {
    const editor = editorRef.current;

    if (editor) {
      editor.innerHTML = "";
      editor.focus();
    }

    selectionRef.current = null;
    onChange("");
  };

  return (
    <>
      <div className={cn("rounded-md border border-input bg-background", className)}>
        <div className="flex flex-wrap gap-1 border-b border-border p-2">
          {TOOLBAR_ACTIONS.map((action) => (
            <Button
              key={action.command}
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onMouseDown={(event) => {
                event.preventDefault();
                saveSelection();
              }}
              onClick={() => applyCommand(action.command)}
            >
              {action.label}
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onMouseDown={(event) => {
              event.preventDefault();
              saveSelection();
              setShowFormulaDialog(true);
            }}
          >
            Math
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={clearEditor}
          >
            Clear
          </Button>
        </div>
        <div className="relative">
          {isBlank && placeholder && (
            <div className="pointer-events-none absolute left-3 top-3 text-sm text-muted-foreground">
              {placeholder}
            </div>
          )}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            onClick={saveSelection}
            onFocus={saveSelection}
            onInput={() => {
              emitChange();
              saveSelection();
            }}
            onKeyUp={saveSelection}
            onMouseUp={saveSelection}
            onBlur={() => {
              saveSelection();
              emitChange(true);
            }}
            onPaste={handlePaste}
            className={cn(
              "min-h-[120px] px-3 py-3 text-sm outline-none [&_div]:my-0 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-0 [&_sub]:align-sub [&_sup]:align-super [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
              editorClassName,
            )}
          />
        </div>
        {showPreview && !isBlank && (
          <div className="border-t border-border bg-muted/20 px-3 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Rendered Preview
            </div>
            <FormattedContent
              html={deferredPreviewValue}
              className={cn("mt-3 text-sm leading-relaxed text-foreground", previewClassName)}
            />
          </div>
        )}
      </div>
      <MathFormulaDialog
        open={showFormulaDialog}
        onOpenChange={setShowFormulaDialog}
        onInsert={insertFormula}
      />
    </>
  );
}
