const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";

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
    return text ? [{ role: "user", parts: [{ text }] }] : [];
  }

  return input
    .map((message) => {
      const text = extractMessageText(message?.content);
      if (!text) return null;

      return {
        role: message?.role === "assistant" ? "model" : "user",
        parts: [{ text }],
      };
    })
    .filter(Boolean);
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
  const response = await generateContent({
    model,
    contents: normalizeContents(input),
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
  const response = await generateContent({
    model,
    contents: normalizeContents(input),
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
