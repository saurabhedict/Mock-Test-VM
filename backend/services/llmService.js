const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";

const IMAGE_FETCH_TIMEOUT_MS = 8000;

/**
 * Fetch an image URL, returning a Gemini-compatible inlineData part.
 * Returns null on failure so callers can safely skip broken images.
 */
const fetchImageAsInlineData = async (url) => {
  if (!url || typeof url !== "string") return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "image/png";
    const mimeType = contentType.split(";")[0].trim();
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return {
      inlineData: {
        mimeType,
        data: base64,
      },
    };
  } catch {
    return null;
  }
};

const getGeminiApiKey = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    const error = new Error("GEMINI_API_KEY is not configured");
    error.status = 500;
    throw error;
  }

  return apiKey;
};

const extractMessageText = (content) => {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";

  return content
    .map((item) => {
      if (typeof item === "string") return item;
      if (item?.type === "input_text" || item?.type === "output_text" || item?.type === "text") {
        return item?.text || "";
      }
      return "";
    })
    .join("\n")
    .trim();
};

const normalizeContents = (input = []) => {
  if (!Array.isArray(input)) {
    const text = extractMessageText(input);
    return { contents: text ? [{ role: "user", parts: [{ text }] }] : [], imageUrls: [] };
  }

  const imageUrls = [];
  const contents = [];

  for (const message of input) {
    const parts = [];

    if (typeof message?.content === "string") {
      const trimmed = message.content.trim();
      if (trimmed) parts.push({ text: trimmed });
    } else if (Array.isArray(message?.content)) {
      for (const item of message.content) {
        if (typeof item === "string") {
          if (item.trim()) parts.push({ text: item.trim() });
        } else if (
          item?.type === "input_text" ||
          item?.type === "output_text" ||
          item?.type === "text"
        ) {
          const t = (item?.text || "").trim();
          if (t) parts.push({ text: t });
        } else if (item?.type === "image_url" && item?.url) {
          // Track this image so it can be fetched asynchronously later
          imageUrls.push({ messageIndex: contents.length, partIndex: parts.length, url: item.url });
          parts.push({ text: "[image attached]" }); // placeholder, will be replaced
        }
      }
    }

    if (!parts.length) continue;

    contents.push({
      role: message?.role === "assistant" ? "model" : "user",
      parts,
    });
  }

  return { contents, imageUrls };
};

const extractResponseText = (response) =>
  (response?.candidates || [])
    .flatMap((candidate) => candidate?.content?.parts || [])
    .map((part) => part?.text || "")
    .join("\n")
    .trim();

const stripCodeFences = (text = "") =>
  text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const sanitizeJsonCandidate = (text = "") =>
  text
    .trim()
    .replace(/,\s*([}\]])/g, "$1");

const buildJsonCandidates = (text = "") => {
  const stripped = stripCodeFences(text);
  const firstBrace = stripped.indexOf("{");
  const lastBrace = stripped.lastIndexOf("}");
  const extractedObject =
    firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace
      ? stripped.slice(firstBrace, lastBrace + 1)
      : "";

  return [...new Set([text, stripped, extractedObject].map(sanitizeJsonCandidate).filter(Boolean))];
};

const tryParseStructuredText = (text = "") => {
  let lastError = null;

  for (const candidate of buildJsonCandidates(text)) {
    try {
      return {
        parsed: JSON.parse(candidate),
        raw: candidate,
      };
    } catch (error) {
      lastError = error;
    }
  }

  return {
    parsed: null,
    raw: "",
    error: lastError,
  };
};

const parseGeminiError = async (response) => {
  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const error = new Error(
    payload?.error?.message || `Gemini request failed with status ${response.status}`
  );
  error.status = response.status;
  error.details = payload?.error || null;
  return error;
};

const generateContent = async ({ model, contents, instructions, generationConfig = {} }) => {
  const apiKey = getGeminiApiKey();

  const response = await fetch(`${GEMINI_API_URL}/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents,
      systemInstruction: instructions
        ? {
            parts: [{ text: instructions }],
          }
        : undefined,
      generationConfig,
    }),
  });

  if (!response.ok) {
    throw await parseGeminiError(response);
  }

  return response.json();
};

const repairStructuredResponse = async ({
  model,
  schemaName,
  schema,
  rawText,
  maxOutputTokens,
}) => {
  const response = await generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              `Repair the malformed JSON for schema "${schemaName}".`,
              "Return valid JSON only.",
              "Do not wrap the result in markdown fences.",
              "",
              "Malformed content:",
              rawText,
            ].join("\n"),
          },
        ],
      },
    ],
    instructions:
      "You repair malformed structured-output responses. Preserve the meaning, but return only valid JSON matching the requested schema exactly.",
    generationConfig: {
      maxOutputTokens: Math.max(900, Math.min(maxOutputTokens, 2200)),
      responseMimeType: "application/json",
      responseJsonSchema: schema,
    },
  });

  return tryParseStructuredText(extractResponseText(response));
};

const createStructuredResponse = async ({
  model,
  input,
  instructions,
  schemaName,
  schema,
  maxOutputTokens = 3500,
}) => {
  const { contents, imageUrls } = normalizeContents(input);

  // Resolve any image URLs into inline data parts
  if (imageUrls.length > 0) {
    const fetched = await Promise.all(imageUrls.map((entry) => fetchImageAsInlineData(entry.url)));
    for (let i = 0; i < imageUrls.length; i++) {
      const entry = imageUrls[i];
      const inlinePart = fetched[i];
      const msg = contents[entry.messageIndex];
      if (msg && inlinePart) {
        // Replace the placeholder with the real image part
        msg.parts[entry.partIndex] = inlinePart;
      } else if (msg) {
        // Remove the placeholder text if image fetch failed
        msg.parts[entry.partIndex] = { text: "[image could not be loaded]" };
      }
    }
  }

  const response = await generateContent({
    model,
    contents,
    instructions,
    generationConfig: {
      maxOutputTokens,
      responseMimeType: "application/json",
      responseJsonSchema: schema,
    },
  });

  const text = extractResponseText(response);
  if (!text) {
    const error = new Error("Gemini returned an empty structured response");
    error.status = 502;
    error.details = response?.promptFeedback || null;
    throw error;
  }

  const initialParse = tryParseStructuredText(text);
  if (initialParse.parsed) {
    return initialParse.parsed;
  }

  const repaired = await repairStructuredResponse({
    model,
    schemaName,
    schema,
    rawText: text,
    maxOutputTokens,
  });

  if (repaired.parsed) {
    return repaired.parsed;
  }

  const error = new Error(`Failed to parse Gemini structured response for ${schemaName}`);
  error.status = 502;
  error.cause = repaired.error || initialParse.error || null;
  error.rawText = text;
  throw error;
};

const createTextResponse = async ({
  model,
  input,
  instructions,
  maxOutputTokens = 900,
}) => {
  const { contents } = normalizeContents(input);
  const response = await generateContent({
    model,
    contents,
    instructions,
    generationConfig: {
      maxOutputTokens,
    },
  });

  return {
    responseId: response?.responseId || response?.modelVersion || "",
    text: extractResponseText(response),
  };
};

module.exports = {
  createStructuredResponse,
  createTextResponse,
};
