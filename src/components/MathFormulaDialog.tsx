import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ensureMathLive } from "@/lib/mathlive";
import FormattedContent from "@/components/FormattedContent";

interface MathFormulaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (latex: string, mode: "inline" | "block") => void;
}

const FORMULA_SNIPPETS = [
  { label: "Fraction", latex: "\\frac{#?}{#?}" },
  { label: "Root", latex: "\\sqrt{#?}" },
  { label: "Integral", latex: "\\int_{#?}^{#?} #?\\,d#?" },
  { label: "Sum", latex: "\\sum_{#?}^{#?} #?" },
  { label: "Derivative", latex: "\\frac{d}{dx}\\left(#?\\right)" },
  { label: "Brackets", latex: "\\left(#?\\right)" },
] as const;

const hideVirtualKeyboard = () => {
  window.mathVirtualKeyboard?.hide?.();
  if (window.mathVirtualKeyboard) {
    window.mathVirtualKeyboard.visible = false;
  }
};

export default function MathFormulaDialog({ open, onOpenChange, onInsert }: MathFormulaDialogProps) {
  const dialogContentRef = useRef<HTMLDivElement | null>(null);
  const mathfieldRef = useRef<MathfieldElementLike | null>(null);
  const latexRef = useRef("");
  const [ready, setReady] = useState(false);
  const [latex, setLatex] = useState("");

  const isMathKeyboardTarget = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;

    return Boolean(
      target.closest("[data-mathlive-keyboard-host]") ||
      target.closest(".ML__keyboard") ||
      target.closest(".MLK__backdrop") ||
      target.closest(".MLK__toolbar") ||
      target.closest(".MLK__plate"),
    );
  };

  useEffect(() => {
    latexRef.current = latex;
  }, [latex]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const load = async () => {
      try {
        await ensureMathLive();
        if (!cancelled) {
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setReady(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      hideVirtualKeyboard();
    };
  }, [open]);

  useEffect(() => {
    if (!open || !ready) return;

    const mathfield = mathfieldRef.current;
    if (!mathfield) return;

    const syncValue = () => setLatex(mathfield.value || "");
    const showKeyboard = () => {
      if (!window.mathVirtualKeyboard) return;
      window.mathVirtualKeyboard.container = document.body;
      window.mathVirtualKeyboard.layouts = ["numeric", "symbols", "alphabetic", "greek"];
      if (window.mathVirtualKeyboard.show) {
        window.mathVirtualKeyboard.show();
      } else {
        window.mathVirtualKeyboard.visible = true;
      }
    };

    mathfield.setValue(latexRef.current || "");
    mathfield.addEventListener("input", syncValue);
    mathfield.addEventListener("focus", showKeyboard);

    window.requestAnimationFrame(() => {
      mathfield.focus();
      showKeyboard();
    });

    return () => {
      mathfield.removeEventListener("input", syncValue);
      mathfield.removeEventListener("focus", showKeyboard);
    };
  }, [open, ready]);

  useEffect(() => {
    if (open) return;

    mathfieldRef.current?.blur();
    hideVirtualKeyboard();
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      mathfieldRef.current?.blur();
      hideVirtualKeyboard();
      setLatex("");
      setReady(false);
    }

    onOpenChange(nextOpen);
  };

  const insertSnippet = (snippet: string) => {
    const mathfield = mathfieldRef.current;
    if (!mathfield) return;

    mathfield.focus();
    if (typeof mathfield.insert === "function") {
      mathfield.insert(snippet, { selectionMode: "placeholder" });
    } else {
      mathfield.executeCommand(["insert", snippet, { selectionMode: "placeholder" }]);
    }
    setLatex(mathfield.value || "");
    window.requestAnimationFrame(() => {
      mathfield.focus();
    });
  };

  const handleInsert = (mode: "inline" | "block") => {
    const trimmed = latex.trim();
    if (!trimmed) return;

    onInsert(trimmed, mode);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        ref={dialogContentRef}
        className="max-w-3xl overflow-visible"
        onInteractOutside={(event) => {
          const target = event.target instanceof Element ? event.target : null;
          if (isMathKeyboardTarget(target)) {
            event.preventDefault();
          }
        }}
        onPointerDownOutside={(event) => {
          const target = event.target instanceof Element ? event.target : null;
          if (isMathKeyboardTarget(target)) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Insert Math Formula</DialogTitle>
          <DialogDescription>
            Build the formula with MathLive, then insert it inline or as a block into the current field.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {FORMULA_SNIPPETS.map((snippet) => (
              <Button
                key={snippet.label}
                type="button"
                variant="outline"
                size="sm"
                onMouseDown={(event) => {
                  event.preventDefault();
                  mathfieldRef.current?.focus();
                }}
                onClick={() => insertSnippet(snippet.latex)}
                disabled={!ready}
              >
                {snippet.label}
              </Button>
            ))}
          </div>

          <div className="rounded-lg border border-input bg-background p-3">
            {ready ? (
              <math-field
                ref={mathfieldRef}
                smart-mode="true"
                virtual-keyboard-mode="manual"
                math-virtual-keyboard-policy="manual"
                className="block min-h-[88px] w-full rounded-md border border-dashed border-border bg-muted/20 px-3 py-3 text-lg"
              />
            ) : (
              <div className="flex min-h-[88px] items-center justify-center rounded-md border border-dashed border-border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
                Loading formula editor...
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                LaTeX
              </div>
              <Textarea
                value={latex}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setLatex(nextValue);
                  mathfieldRef.current?.setValue(nextValue);
                }}
                placeholder="\\int_0^1 x^2\\,dx"
                className="min-h-[140px] font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Preview
              </div>
              <div className="min-h-[140px] rounded-lg border border-input bg-muted/20 p-4">
                {latex.trim() ? (
                  <FormattedContent html={`$$${latex}$$`} className="text-base text-foreground" />
                ) : (
                  <div className="text-sm text-muted-foreground">The rendered formula preview appears here.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => handleInsert("inline")}
            disabled={!latex.trim()}
          >
            Insert Inline
          </Button>
          <Button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => handleInsert("block")}
            disabled={!latex.trim()}
          >
            Insert Block
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
