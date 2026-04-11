import { useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
import { normalizeAiResponse } from "@/lib/aiContent";
import { cn } from "@/lib/utils";

interface MathRendererProps {
  content?: string;
  className?: string;
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
};

/**
 * Renders mixed AI output with Markdown, code, and KaTeX math.
 * Example:
 * <MathRenderer content={"Use $a^2+b^2=c^2$.\n\n```ts\nconst area = Math.PI * r ** 2;\n```"} />
 */
export default function MathRenderer({ content = "", className }: MathRendererProps) {
  const normalizedContent = useMemo(() => normalizeAiResponse(content), [content]);

  if (!normalizedContent) return null;

  return (
    <div className={cn("math-renderer text-current", className)}>
      <ReactMarkdown
        components={markdownComponents}
        rehypePlugins={[rehypeKatex]}
        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}
