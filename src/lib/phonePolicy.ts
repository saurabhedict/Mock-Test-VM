export const INDIAN_PHONE_MESSAGE = "Please enter a valid Indian phone number (10 digits starting with 6-9)";

export const normalizeIndianPhone = (value: string) => {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  let localNumber = digits;

  if (digits.length === 12 && digits.startsWith("91")) {
    localNumber = digits.slice(2);
  }

  if (!/^[6-9]\d{9}$/.test(localNumber)) return null;
  return `+91${localNumber}`;
};
