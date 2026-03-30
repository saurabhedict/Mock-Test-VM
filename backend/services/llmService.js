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

  try {
    return JSON.parse(text);
  } catch (parseError) {
    const error = new Error(`Failed to parse Gemini structured response for ${schemaName}`);
    error.status = 502;
    error.cause = parseError;
    error.rawText = text;
    throw error;
  }
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
