const EXAM_AVAILABILITY_STATUSES = ["available", "coming_soon", "unavailable"];

const normalizeExamAvailabilityStatus = (value) =>
  EXAM_AVAILABILITY_STATUSES.includes(value) ? value : "available";

module.exports = {
  EXAM_AVAILABILITY_STATUSES,
  normalizeExamAvailabilityStatus,
};
