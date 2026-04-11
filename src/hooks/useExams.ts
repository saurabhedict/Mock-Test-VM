import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import type { DynamicExam } from "@/lib/examCatalog";

interface UseExamsResult {
  exams: DynamicExam[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useExams(): UseExamsResult {
  const query = useQuery({
    queryKey: ["exams"],
    queryFn: async () => {
      const { data } = await api.get("/exams");
      return Array.isArray(data) ? data : [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  return {
    exams: query.data ?? [],
    loading: query.isPending && !query.data,
    error: query.error ? "Failed to load exams" : null,
    refetch: () => {
      void query.refetch();
    },
  };
}
