const VALIDITY_MODES = {
  FIXED_DATE: "fixed_date",
  DURATION: "duration",
};

const VALIDITY_UNITS = {
  MONTHS: "months",
  YEARS: "years",
};

const DEFAULT_VALIDITY = {
  validityMode: VALIDITY_MODES.DURATION,
  validityValue: 12,
  validityUnit: VALIDITY_UNITS.MONTHS,
  fixedExpiryDate: null,
};

const sanitizePlanValidity = (payload = {}, fallback = DEFAULT_VALIDITY) => {
  const requestedMode = String(payload.validityMode || fallback.validityMode || "").trim();
  const validityMode =
    requestedMode === VALIDITY_MODES.FIXED_DATE ? VALIDITY_MODES.FIXED_DATE : VALIDITY_MODES.DURATION;

  if (validityMode === VALIDITY_MODES.FIXED_DATE) {
    const rawFixedExpiryDate = payload.fixedExpiryDate ?? fallback.fixedExpiryDate;
    const fixedExpiryDate = rawFixedExpiryDate ? new Date(rawFixedExpiryDate) : null;

    if (!fixedExpiryDate || Number.isNaN(fixedExpiryDate.getTime())) {
      const error = new Error("A valid fixed expiry date is required");
      error.status = 400;
      throw error;
    }

    return {
      validityMode,
      fixedExpiryDate,
      validityValue: null,
      validityUnit: null,
    };
  }

  const rawValue = payload.validityValue ?? fallback.validityValue;
  const validityValue = Number(rawValue);
  const rawUnit = String(payload.validityUnit || fallback.validityUnit || "").trim();
  const validityUnit =
    rawUnit === VALIDITY_UNITS.YEARS ? VALIDITY_UNITS.YEARS : VALIDITY_UNITS.MONTHS;

  if (!Number.isFinite(validityValue) || validityValue < 1) {
    const error = new Error("A validity duration of at least 1 is required");
    error.status = 400;
    throw error;
  }

  return {
    validityMode,
    fixedExpiryDate: null,
    validityValue: Math.round(validityValue),
    validityUnit,
  };
};

const calculateAccessExpiry = (validity = {}, purchaseDate = new Date()) => {
  if (validity.validityMode === VALIDITY_MODES.FIXED_DATE) {
    return validity.fixedExpiryDate ? new Date(validity.fixedExpiryDate) : null;
  }

  if (
    validity.validityMode === VALIDITY_MODES.DURATION &&
    validity.validityValue &&
    validity.validityUnit
  ) {
    const expiresAt = new Date(purchaseDate);
    if (validity.validityUnit === VALIDITY_UNITS.YEARS) {
      expiresAt.setFullYear(expiresAt.getFullYear() + Number(validity.validityValue));
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + Number(validity.validityValue));
    }
    return expiresAt;
  }

  return null;
};

const serializeValidity = (validity = {}) => ({
  validityMode: validity.validityMode || DEFAULT_VALIDITY.validityMode,
  fixedExpiryDate: validity.fixedExpiryDate || null,
  validityValue:
    validity.validityMode === VALIDITY_MODES.DURATION
      ? Number(validity.validityValue || DEFAULT_VALIDITY.validityValue)
      : null,
  validityUnit:
    validity.validityMode === VALIDITY_MODES.DURATION
      ? validity.validityUnit || DEFAULT_VALIDITY.validityUnit
      : null,
});

const isPurchaseActive = (purchase = {}, now = new Date()) => {
  if (!purchase?.expiresAt) return true;
  return new Date(purchase.expiresAt).getTime() >= now.getTime();
};

module.exports = {
  VALIDITY_MODES,
  VALIDITY_UNITS,
  DEFAULT_VALIDITY,
  sanitizePlanValidity,
  calculateAccessExpiry,
  serializeValidity,
  isPurchaseActive,
};
