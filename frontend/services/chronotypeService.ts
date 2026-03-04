import { apiFetch } from "@/services/api";

export const chronotypeService = {
  submitAssessment(responses: Record<number, number>) {
    const normalized = Object.fromEntries(
      Object.entries(responses).map(([key, value]) => [String(key), value]),
    );
    return apiFetch("/chronotype/assessment", {
      method: "POST",
      body: JSON.stringify({ responses: normalized }),
    });
  },
  current() {
    return apiFetch<{ assessment: unknown | null }>("/chronotype/current");
  },
  getCurrent() {
    return apiFetch<{ assessment: Record<string, unknown> }>("/chronotype/current");
  },
  idealTimes() {
    return apiFetch<{
      wake_time: string;
      sleep_time: string;
      peak_performance_start: string;
      peak_performance_end: string;
      caffeine_cutoff: string;
      exercise_optimal_start: string;
      exercise_optimal_end: string;
      error?: string;
    }>("/chronotype/ideal-times");
  },
};

