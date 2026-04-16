import type { DynamicExam } from "@/lib/examCatalog";

const PROCESS_BY_EXAM_KEY: Array<{ key: string; process: string }> = [
  { key: "jee", process: "JoSAA" },
  { key: "mht-cet", process: "CAP" },
  { key: "cet", process: "CAP" },
  { key: "neet", process: "MCC" },
];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const resolveExamLabel = (examId?: string, exams: DynamicExam[] = []) => {
  const normalized = String(examId || "").trim().toLowerCase();
  if (!normalized) return "";

  const exam = exams.find((item) => item.examId === normalized);
  if (exam) return exam.shortName || exam.examName || normalized.toUpperCase();

  return normalized.toUpperCase();
};

export const resolveCounsellingProcessName = (examId?: string) => {
  const normalized = String(examId || "").trim().toLowerCase();
  if (!normalized) return "Counselling";

  const match = PROCESS_BY_EXAM_KEY.find((item) => normalized.includes(item.key));
  return match?.process || "Counselling";
};

export const getExamSpecificPlanName = (planName: string, processName: string) => {
  const safeProcess = String(processName || "").trim();
  if (!safeProcess || safeProcess === "Counselling") return planName;

  const processRegex = new RegExp(`\\b${escapeRegExp(safeProcess)}\\b`, "i");
  if (processRegex.test(planName)) return planName;

  return `${safeProcess} ${planName}`;
};
