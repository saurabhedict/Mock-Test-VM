import { useEffect, useState } from "react";
import api from "@/services/api";
import type { DynamicExam } from "@/lib/examCatalog";

interface UseExamsResult {
  exams: DynamicExam[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useExams(): UseExamsResult {
  const [exams, setExams] = useState<DynamicExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api
      .get("/exams")
      .then(({ data }) => {
        if (cancelled) return;
        setExams(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setExams([]);
        setError("Failed to load exams");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tick]);

  return {
    exams,
    loading,
    error,
    refetch: () => setTick((current) => current + 1),
  };
}
