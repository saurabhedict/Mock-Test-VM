import { useEffect, useMemo, useRef } from "react";
import renderMathInElement from "katex/contrib/auto-render";
import "katex/dist/katex.min.css";
import { isRichTextBlank, normalizeRichText } from "@/lib/richText";
import { cn } from "@/lib/utils";

interface FormattedContentProps {
  html?: string;
  className?: string;
}

export default function FormattedContent({ html = "", className }: FormattedContentProps) {
  const normalizedHtml = useMemo(() => normalizeRichText(html), [html]);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    // Use KaTeX globally for uniform math rendering
    window.requestAnimationFrame(() => {
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
  }, [normalizedHtml]);

  if (isRichTextBlank(html)) return null;

  return (
    <div
      ref={contentRef}
      className={cn(
        "break-words text-inherit [&_.MJX-TEX]:whitespace-normal [&_b]:text-inherit [&_div]:my-0 [&_div]:text-inherit [&_em]:text-inherit [&_i]:text-inherit [&_li]:text-inherit [&_mjx-container]:max-w-full [&_mjx-container]:overflow-x-auto [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-0 [&_p]:text-inherit [&_span]:text-inherit [&_strong]:text-inherit [&_sub]:align-sub [&_sup]:align-super [&_svg]:max-w-full [&_svg]:text-inherit [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: normalizedHtml }}
    />
  );
}
