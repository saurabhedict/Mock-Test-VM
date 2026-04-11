export type ExamAvailabilityStatus = "available" | "coming_soon" | "unavailable";

export const EXAM_AVAILABILITY_OPTIONS: Array<{
  value: ExamAvailabilityStatus;
  label: string;
  description: string;
}> = [
  {
    value: "available",
    label: "Available",
    description: "Students can open this exam and view tests.",
  },
  {
    value: "coming_soon",
    label: "Coming Soon",
    description: "Students see the exam card, but cannot open it yet.",
  },
  {
    value: "unavailable",
    label: "Tests Unavailable",
    description: "Students see that tests are not available for this exam.",
  },
];

export const normalizeExamAvailabilityStatus = (
  value?: string | null,
): ExamAvailabilityStatus => {
  if (value === "coming_soon" || value === "unavailable") {
    return value;
  }

  return "available";
};

export const getExamAvailabilityLabel = (value?: string | null) =>
  EXAM_AVAILABILITY_OPTIONS.find((option) => option.value === normalizeExamAvailabilityStatus(value))?.label ||
  "Available";

export const getExamAvailabilityDescription = (value?: string | null) =>
  EXAM_AVAILABILITY_OPTIONS.find((option) => option.value === normalizeExamAvailabilityStatus(value))?.description ||
  "Students can open this exam and view tests.";

export const getExamAvailabilityBadgeClass = (value?: string | null) => {
  const status = normalizeExamAvailabilityStatus(value);

  if (status === "coming_soon") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "unavailable") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
};

export const isExamOpenForStudents = (value?: string | null) =>
  normalizeExamAvailabilityStatus(value) === "available";
