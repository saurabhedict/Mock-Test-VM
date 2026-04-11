import { type HTMLAttributes, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import renderMathInElement from "katex/contrib/auto-render";
import "katex/dist/katex.min.css";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { normalizeAiResponse } from "@/lib/aiContent";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MathRendererProps {
  content?: string;
  className?: string;
}

type CodeComponentProps = HTMLAttributes<HTMLElement> & {
  className?: string;
  children?: ReactNode;
};

type CodeTokenType = "plain" | "keyword" | "string" | "comment" | "number" | "operator" | "punctuation";
type CodeToken = { type: CodeTokenType; value: string };

const GENERIC_KEYWORDS = [
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "default",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "if",
  "import",
  "in",
  "interface",
  "let",
  "new",
  "null",
  "return",
  "static",
  "switch",
  "throw",
  "true",
  "try",
  "type",
  "var",
  "while",
];

const LANGUAGE_KEYWORDS: Record<string, string[]> = {
  bash: ["case", "do", "done", "echo", "elif", "else", "esac", "export", "fi", "for", "function", "if", "in", "local", "read", "then", "while"],
  css: ["display", "flex", "grid", "position", "relative", "absolute", "fixed", "color", "background", "font", "padding", "margin"],
  html: ["class", "div", "section", "span", "button", "input", "form", "header", "main", "article", "aside"],
  json: ["false", "null", "true"],
  python: ["and", "as", "class", "def", "elif", "else", "False", "for", "from", "if", "import", "in", "is", "None", "not", "or", "return", "True", "while"],
  ts: GENERIC_KEYWORDS,
  tsx: GENERIC_KEYWORDS,
  js: GENERIC_KEYWORDS,
  jsx: GENERIC_KEYWORDS,
  yaml: ["false", "null", "true"],
  yml: ["false", "null", "true"],
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getKeywordRegex = (language: string) => {
  const keywords = LANGUAGE_KEYWORDS[language] || GENERIC_KEYWORDS;
  return new RegExp(`^\\b(?:${keywords.map(escapeRegex).join("|")})\\b`);
};

const getTokenClassName = (type: CodeTokenType) => {
  switch (type) {
    case "keyword":
      return "text-[#F4A261]";
    case "string":
      return "text-[#9FD6B5]";
    case "comment":
      return "text-[#93867D]";
    case "number":
      return "text-[#E9C46A]";
    case "operator":
      return "text-[#E8C2A0]";
    case "punctuation":
      return "text-[#D7C6B8]";
    default:
      return "text-inherit";
  }
};

const tokenizeLine = (line: string, language: string): CodeToken[] => {
  const tokens: CodeToken[] = [];
  const keywordRegex = getKeywordRegex(language);
  let cursor = 0;

  while (cursor < line.length) {
    const rest = line.slice(cursor);

    if (rest.startsWith("//") || ((language === "python" || language === "bash" || language === "yaml" || language === "yml") && rest.startsWith("#"))) {
      tokens.push({ type: "comment", value: rest });
      break;
    }

    if (rest.startsWith("/*")) {
      const endIndex = rest.indexOf("*/");
      const value = endIndex >= 0 ? rest.slice(0, endIndex + 2) : rest;
      tokens.push({ type: "comment", value });
      cursor += value.length;
      continue;
    }

    if (rest.startsWith("<!--")) {
      const endIndex = rest.indexOf("-->");
      const value = endIndex >= 0 ? rest.slice(0, endIndex + 3) : rest;
      tokens.push({ type: "comment", value });
      cursor += value.length;
      continue;
    }

    const stringMatch = rest.match(/^("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|`(?:\\.|[^`])*`)/);
    if (stringMatch) {
      tokens.push({ type: "string", value: stringMatch[0] });
      cursor += stringMatch[0].length;
      continue;
    }

    const numberMatch = rest.match(/^\b\d+(?:\.\d+)?\b/);
    if (numberMatch) {
      tokens.push({ type: "number", value: numberMatch[0] });
      cursor += numberMatch[0].length;
      continue;
    }

    const keywordMatch = rest.match(keywordRegex);
    if (keywordMatch) {
      tokens.push({ type: "keyword", value: keywordMatch[0] });
      cursor += keywordMatch[0].length;
      continue;
    }

    const operatorMatch = rest.match(/^(=>|===|!==|==|!=|<=|>=|\+\+|--|\|\||&&|[-+*/%<>!=?:]+)/);
    if (operatorMatch) {
      tokens.push({ type: "operator", value: operatorMatch[0] });
      cursor += operatorMatch[0].length;
      continue;
    }

    if (/^[()[\]{}.,;]/.test(rest)) {
      tokens.push({ type: "punctuation", value: rest[0] });
      cursor += 1;
      continue;
    }

    tokens.push({ type: "plain", value: rest[0] });
    cursor += 1;
  }

  return tokens;
};

function HighlightedCodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const lines = useMemo(() => code.split("\n"), [code]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Code copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="chat-code-block my-4 overflow-hidden rounded-[1.25rem] border border-[#2D241D] bg-[#1A140F] text-[#FFF7F0]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-xs uppercase tracking-[0.24em] text-[#F2DED0]/70">
        <span>{language || "text"}</span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-medium tracking-normal text-[#FFF7F0] transition hover:border-white/20 hover:bg-white/5"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-[#F4A261]" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <pre className="m-0 overflow-x-auto px-4 py-4 text-xs leading-6">
        <code className="whitespace-pre">
          {lines.map((line, lineIndex) => (
            <span key={`${language}-${lineIndex}`} className="block">
              {line.length === 0 ? " " : tokenizeLine(line, language).map((token, tokenIndex) => (
                <span key={`${lineIndex}-${tokenIndex}`} className={getTokenClassName(token.type)}>
                  {token.value}
                </span>
              ))}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

const markdownComponents: Components = {
  a: ({ href, children, ...props }) => {
    const isExternalLink = Boolean(href && !href.startsWith("/") && !href.startsWith("#"));
    return (
      <a
        {...props}
        href={href}
        rel={isExternalLink ? "noreferrer" : undefined}
        target={isExternalLink ? "_blank" : undefined}
      >
        {children}
      </a>
    );
  },
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children, ...props }: CodeComponentProps) => {
    const rawCode = String(children || "").replace(/\n$/, "");
    const language = (className || "").replace("language-", "").trim();
    const isInline = !className;

    if (isInline) {
      return (
        <code {...props} className={cn("no-math rounded-md bg-muted px-1.5 py-0.5 text-[0.92em]", className)}>
          {children}
        </code>
      );
    }

    return <HighlightedCodeBlock code={rawCode} language={language || "text"} />;
  },
};

export default function MathRenderer({ content = "", className }: MathRendererProps) {
  const normalizedContent = useMemo(() => normalizeAiResponse(content), [content]);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const frame = window.requestAnimationFrame(() => {
      renderMathInElement(container, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
        ],
        ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
        ignoredClasses: ["no-math"],
        throwOnError: false,
        strict: "ignore",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [normalizedContent]);

  if (!normalizedContent) return null;

  return (
    <div ref={contentRef} className={cn("math-renderer text-current", className)}>
      <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}
