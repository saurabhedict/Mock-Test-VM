const OpenAI = require("openai");

let cachedClient = null;

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY is not configured");
    error.status = 500;
    throw error;
  }

  if (!cachedClient) {
    cachedClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return cachedClient;
};

const extractOutputText = (response) => {
  if (response?.output_text) return String(response.output_text).trim();

  const contents =
    response?.output?.flatMap((item) =>
      Array.isArray(item?.content)
        ? item.content
            .filter((contentItem) => contentItem?.type === "output_text" || contentItem?.type === "text")
            .map((contentItem) => contentItem?.text || "")
        : []
    ) || [];

  return contents.join("\n").trim();
};

const createStructuredResponse = async ({
  model,
  input,
  instructions,
  schemaName,
  schema,
  maxOutputTokens = 3500,
}) => {
  const client = getOpenAIClient();
  const response = await client.responses.create({
    model,
    instructions,
    input,
    max_output_tokens: maxOutputTokens,
    text: {
      format: {
        type: "json_schema",
        name: schemaName,
        strict: true,
        schema,
      },
    },
  });

  const text = extractOutputText(response);
  if (!text) {
    const error = new Error("OpenAI returned an empty structured response");
    error.status = 502;
    throw error;
  }

  try {
    return JSON.parse(text);
  } catch (parseError) {
    const error = new Error("Failed to parse OpenAI structured response");
    error.status = 502;
    error.cause = parseError;
    throw error;
  }
};

const createTextResponse = async ({
  model,
  input,
  instructions,
  maxOutputTokens = 900,
}) => {
  const client = getOpenAIClient();
  const response = await client.responses.create({
    model,
    instructions,
    input,
    max_output_tokens: maxOutputTokens,
  });

  return {
    responseId: response.id,
    text: extractOutputText(response),
  };
};

module.exports = {
  getOpenAIClient,
  createStructuredResponse,
  createTextResponse,
};
