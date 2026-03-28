const ENTITY_MAP = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

const decodeEntities = (value = "") =>
  Object.entries(ENTITY_MAP).reduce(
    (accumulator, [entity, replacement]) => accumulator.replace(new RegExp(entity, "g"), replacement),
    value
  );

const stripHtml = (value = "") =>
  decodeEntities(
    String(value)
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );

const unwrapMathDelimiters = (value = "") => {
  let normalized = String(value).trim();

  while (normalized.length > 1) {
    if (normalized.startsWith("$$") && normalized.endsWith("$$")) {
      normalized = normalized.slice(2, -2).trim();
      continue;
    }

    if (normalized.startsWith("$") && normalized.endsWith("$")) {
      normalized = normalized.slice(1, -1).trim();
      continue;
    }

    break;
  }

  return normalized;
};

const normalizeWrittenAnswer = (value = "") =>
  unwrapMathDelimiters(stripHtml(value))
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const truncateText = (value = "", limit = 280) => {
  const plain = stripHtml(value);
  if (plain.length <= limit) return plain;
  return `${plain.slice(0, Math.max(limit - 3, 0)).trim()}...`;
};

const optionIndexToLabel = (index) => String.fromCharCode(65 + Number(index || 0));

module.exports = {
  decodeEntities,
  stripHtml,
  unwrapMathDelimiters,
  normalizeWrittenAnswer,
  truncateText,
  optionIndexToLabel,
};
