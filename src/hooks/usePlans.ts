import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import type { Plan } from "@/data/plans";

interface UsePlansResult {
  plans: Plan[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePlans(): UsePlansResult {
  const query = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data } = await api.get("/plans");
      return data.plans || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  return {
    plans: query.data ?? [],
    loading: query.isPending && !query.data,
    error: query.error ? "Failed to load plans" : null,
    refetch: () => {
      void query.refetch();
    },
  };
}
