export type PlanValidityMode = "fixed_date" | "duration";
export type PlanValidityUnit = "months" | "years";

export interface PlanValidityConfig {
  validityMode?: PlanValidityMode | null;
  fixedExpiryDate?: string | null;
  validityValue?: number | null;
  validityUnit?: PlanValidityUnit | null;
}

const ABSOLUTE_DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const formatAbsoluteDate = (value?: string | null) => {
  if (!value) return "";
  return ABSOLUTE_DATE_FORMATTER.format(new Date(value));
};

export const formatPlanValidityLabel = (validity: PlanValidityConfig) => {
  if (validity.validityMode === "fixed_date") {
    if (!validity.fixedExpiryDate) return "Select expiry date";
    return `Expires on ${formatAbsoluteDate(validity.fixedExpiryDate)}`;
  }

  const durationValue = Number(validity.validityValue || 12);
  const durationUnit = validity.validityUnit === "years" ? "year" : "month";
  const pluralizedUnit = durationValue === 1 ? durationUnit : `${durationUnit}s`;
  return `Valid for ${durationValue} ${pluralizedUnit} from purchase`;
};

export const formatPurchaseValidityLabel = (purchase: {
  expiresAt?: string | null;
  validityMode?: PlanValidityMode | null;
  fixedExpiryDate?: string | null;
  validityValue?: number | null;
  validityUnit?: PlanValidityUnit | null;
}) => {
  if (purchase.expiresAt) {
    return `Access until ${formatAbsoluteDate(purchase.expiresAt)}`;
  }

  return formatPlanValidityLabel({
    validityMode: (purchase.validityMode || "duration") as PlanValidityMode,
    fixedExpiryDate: purchase.fixedExpiryDate || null,
    validityValue: purchase.validityValue || null,
    validityUnit: (purchase.validityUnit || "months") as PlanValidityUnit,
  });
};

export const isPurchaseActive = (purchase: { expiresAt?: string | null }) => {
  if (!purchase.expiresAt) return true;
  return new Date(purchase.expiresAt).getTime() >= Date.now();
};
