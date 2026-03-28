import type * as React from "react";

declare global {
  type MathfieldElementLike = HTMLElement & {
    value: string;
    insert: (value: string, options?: Record<string, unknown>) => boolean;
    setValue: (value?: string, options?: Record<string, unknown>) => void;
    executeCommand: (command: string | [string, ...unknown[]]) => boolean;
    focus: () => void;
    blur: () => void;
  };

  interface Window {
    mathVirtualKeyboard?: {
      visible?: boolean;
      show?: () => void;
      hide?: () => void;
      layouts?: "default" | string[] | Record<string, unknown> | Array<Record<string, unknown>>;
      container?: HTMLElement | null;
    };
  };

  namespace JSX {
    interface IntrinsicElements {
      "math-field": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        ref?: React.Ref<MathfieldElementLike>;
        readonly?: boolean;
        "smart-mode"?: boolean | "true" | "false";
        "virtual-keyboard-mode"?: "manual" | "onfocus" | "off";
        "math-virtual-keyboard-policy"?: "manual" | "auto" | "sandboxed" | "off";
        class?: string;
      };
    }
  }
}

export {};
