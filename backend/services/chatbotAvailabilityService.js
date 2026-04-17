const CREDIT_LIMIT_PATTERNS = [
  /insufficient[_\s-]?quota/i,
  /quota\s+exceeded/i,
  /exceeded\s+your\s+current\s+quota/i,
  /resource[_\s-]?exhausted/i,
  /billing/i,
  /\bcredit(s)?\b/i,
];

const disabledState = {
  disabled: false,
  reason: "",
  disabledAt: null,
  trigger: "",
};

const sanitizeReason = (reason = "") =>
  String(reason || "").trim() || "Chatbot is temporarily unavailable due to exhausted AI credits.";

const getErrorSignals = (error) => {
  const details = error?.details || {};
  return [
    error?.message,
    error?.code,
    details?.message,
    details?.status,
    details?.code,
    details?.reason,
    JSON.stringify(details || {}),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
};

const isCreditLimitError = (error) => {
  const signals = getErrorSignals(error);
  return signals.some((value) => CREDIT_LIMIT_PATTERNS.some((pattern) => pattern.test(value)));
};

const disableChatbot = ({ reason, trigger = "unknown" } = {}) => {
  disabledState.disabled = true;
  disabledState.reason = sanitizeReason(reason);
  disabledState.disabledAt = new Date().toISOString();
  disabledState.trigger = String(trigger || "unknown");
  return { ...disabledState };
};

const getChatbotStatus = () => {
  if (String(process.env.CHATBOT_FORCE_DISABLED || "").toLowerCase() === "true") {
    return {
      disabled: true,
      reason: sanitizeReason(process.env.CHATBOT_FORCE_DISABLED_REASON),
      disabledAt: null,
      trigger: "env",
    };
  }

  return { ...disabledState };
};

module.exports = {
  isCreditLimitError,
  disableChatbot,
  getChatbotStatus,
};
