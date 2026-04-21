export const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters and include 1 uppercase letter, 1 number, and 1 special character";

const MIN_PASSWORD_LENGTH = 8;
const UPPERCASE_REGEX = /[A-Z]/;
const NUMBER_REGEX = /\d/;
const SPECIAL_CHAR_REGEX = /[^A-Za-z0-9]/;

export type PasswordRule = {
  key: "length" | "uppercase" | "number" | "special";
  label: string;
  passed: boolean;
};

export const getPasswordRules = (password: string): PasswordRule[] => [
  { key: "length", label: "At least 8 characters", passed: password.length >= MIN_PASSWORD_LENGTH },
  { key: "uppercase", label: "At least 1 uppercase letter", passed: UPPERCASE_REGEX.test(password) },
  { key: "number", label: "At least 1 number", passed: NUMBER_REGEX.test(password) },
  { key: "special", label: "At least 1 special character", passed: SPECIAL_CHAR_REGEX.test(password) },
];

export const isStrongPassword = (password: string) => getPasswordRules(password).every((rule) => rule.passed);
