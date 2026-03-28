import { useState, useEffect } from "react";
import api from "@/services/api";
import type { Plan } from "@/data/plans";

interface UsePlansResult {
  plans: Plan[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePlans(): UsePlansResult {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get("/plans")
      .then(({ data }) => {
        if (!cancelled) {
          setPlans(data.plans || []);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPlans([]);
          setError("Failed to load plans");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tick]);

  return { plans, loading, error, refetch: () => setTick((t) => t + 1) };
}
