const toIdString = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value.toHexString === "function") {
    return value.toHexString();
  }

  if (typeof value.toString === "function") {
    const stringValue = value.toString();
    if (stringValue && stringValue !== "[object Object]") {
      return stringValue;
    }
  }

  return String(value);
};

module.exports = {
  toIdString,
};
