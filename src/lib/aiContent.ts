const BLOCK_PLACEHOLDER_PREFIX = "__AI_BLOCK_";
const MATH_FENCE_LANGUAGES = new Set(["math", "latex", "tex", "katex"]);
const BLOCK_MATH_ENVIRONMENTS = new Set([
  "align",
  "align*",
  "aligned",
  "array",
  "bmatrix",
  "Bmatrix",
  "cases",
  "equation",
  "equation*",
  "gather",
  "gather*",
  "matrix",
  "multline",
  "multline*",
  "pmatrix",
  "split",
  "vmatrix",
  "Vmatrix",
]);
const KNOWN_MATH_WORDS = new Set([
  "alpha",
  "beta",
  "cos",
  "cot",
  "csc",
  "delta",
  "det",
  "gamma",
  "gcd",
  "int",
  "lambda",
  "lcm",
  "lim",
  "ln",
  "log",
  "mod",
  "phi",
  "pi",
  "psi",
  "sec",
  "sin",
  "sigma",
  "sum",
  "tan",
  "theta",
]);
const COMMON_LATEX_COMMANDS = new Set([
  "alpha",
  "beta",
  "cdot",
  "cos",
  "cot",
  "csc",
  "delta",
  "frac",
  "gamma",
  "geq",
  "infty",
  "int",
  "lambda",
  "leq",
  "left",
  "lim",
  "log",
  "ln",
  "mathbb",
  "mathbf",
  "mathrm",
  "neq",
  "phi",
  "pi",
  "pm",
  "right",
  "sin",
  "sqrt",
  "sum",
  "tan",
  "theta",
  "times",
]);

type CapturedBlock = {
  placeholder: string;
  language: string;
  body: string;
  raw: string;
};

const decodeBasicHtmlEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");

const normalizeBasicHtml = (value: string) =>
  decodeBasicHtmlEntities(
    value
      .replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_, code) => {
        const normalizedCode = decodeBasicHtmlEntities(String(code || "")).trim();
        return normalizedCode ? `\n\n\`\`\`\n${normalizedCode}\n\`\`\`\n\n` : "\n\n";
      })
      .replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, (_, __, text) => `**${String(text || "").trim()}**`)
      .replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, (_, __, text) => `*${String(text || "").trim()}*`)
      .replace(/<code>([\s\S]*?)<\/code>/gi, (_, text) => `\`${decodeBasicHtmlEntities(String(text || "")).trim()}\``)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|article|blockquote|h[1-6]|ul|ol)>/gi, "\n\n")
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  );

const captureCodeFences = (value: string) => {
  const blocks: CapturedBlock[] = [];
  const masked = value.replace(/```([\w-]*)[^\S\r\n]*\r?\n?([\s\S]*?)```/g, (raw, language = "", body = "") => {
    const placeholder = `${BLOCK_PLACEHOLDER_PREFIX}${blocks.length}__`;
    blocks.push({
      placeholder,
      language: String(language || "").trim().toLowerCase(),
      body: String(body || ""),
      raw,
    });
    return placeholder;
  });

  return { blocks, masked };
};

const restoreCodeFences = (value: string, blocks: CapturedBlock[]) =>
  blocks.reduce((currentValue, block) => {
    const replacement = MATH_FENCE_LANGUAGES.has(block.language)
      ? `\n\n$$\n${block.body.trim()}\n$$\n\n`
      : block.raw;
    return currentValue.replace(block.placeholder, () => replacement);
  }, value);

const wrapEnvironmentBlocks = (value: string) =>
  value.replace(/\\begin\{([A-Za-z*]+)\}[\s\S]*?\\end\{\1\}/g, (match, environment) => {
    if (!BLOCK_MATH_ENVIRONMENTS.has(String(environment || ""))) {
      return match;
    }

    if (/^\s*\$\$[\s\S]*\$\$\s*$/.test(match)) {
      return match;
    }

    return `\n\n$$\n${match.trim()}\n$$\n\n`;
  });

const normalizeMathDelimiters = (value: string) =>
  value
    .replace(/\\\[((?:.|\n)*?)\\\]/g, (_, expression) => {
      const trimmed = String(expression || "").trim();
      return trimmed ? `\n\n$$\n${trimmed}\n$$\n\n` : "";
    })
    .replace(/\\\((.+?)\\\)/g, (_, expression) => {
      const trimmed = String(expression || "").trim();
      return trimmed ? `$${trimmed}$` : "";
    });

const fixEscapedLatex = (value: string) =>
  value
    .replace(/\\\\([()[\]])/g, "\\$1")
    .replace(/\\\\([A-Za-z]+)/g, (match, command) => (COMMON_LATEX_COMMANDS.has(command) ? `\\${command}` : match));

const looksLikeStandaloneMath = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith(">") ||
    trimmed.startsWith("- ") ||
    trimmed.startsWith("* ") ||
    /^\d+\.\s/.test(trimmed) ||
    trimmed.includes("`") ||
    trimmed.includes(BLOCK_PLACEHOLDER_PREFIX)
  ) {
    return false;
  }

  if (
    trimmed.startsWith("$") ||
    trimmed.startsWith("$$") ||
    trimmed.startsWith("\\(") ||
    trimmed.startsWith("\\[")
  ) {
    return false;
  }

  const hasMathSignal =
    /\\(?:frac|sqrt|sum|int|lim|log|ln|sin|cos|tan|cot|sec|csc|theta|phi|pi)|[=^_]/.test(trimmed);
  if (!hasMathSignal) return false;

  const proseWords = trimmed
    .split(/\s+/)
    .map((token) => token.replace(/[^A-Za-z]/g, "").toLowerCase())
    .filter((token) => token.length >= 4 && !KNOWN_MATH_WORDS.has(token));

  return proseWords.length <= 3;
};

const wrapStandaloneMathLines = (value: string) =>
  value
    .split("\n")
    .map((line) => {
      if (!looksLikeStandaloneMath(line)) {
        return line;
      }

      return `$$\n${line.trim()}\n$$`;
    })
    .join("\n");

const collapseBlankLines = (value: string) =>
  value
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export const normalizeAiResponse = (value = "") => {
  if (!value.trim()) return "";

  const source = normalizeBasicHtml(value).replace(/\r\n?/g, "\n").replace(/\u200b/g, "");
  const { blocks, masked } = captureCodeFences(source);
  const normalized = wrapStandaloneMathLines(normalizeMathDelimiters(fixEscapedLatex(wrapEnvironmentBlocks(masked))));
  return collapseBlankLines(restoreCodeFences(normalized, blocks));
};
