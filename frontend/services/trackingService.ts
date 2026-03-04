import { apiFetch } from "@/services/api";
import type { Tracking } from "@/types/domain";

export interface TrackingPayload {
  date?: string;
  actual_sleep_time?: string;
  actual_wake_time?: string;
  sleep_quality?: number;
  notes?: string;
  energy_levels?: Partial<
    Record<"early_morning" | "morning" | "midday" | "afternoon" | "evening" | "night", number>
  >;
}

export const trackingService = {
  submit(payload: TrackingPayload) {
    return apiFetch<{ tracking: Tracking }>("/tracking", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  today() {
    return apiFetch<{ tracking: Tracking | null; is_complete: boolean }>("/tracking/today");
  },
  history(startDate: string, endDate: string, limit = 30) {
    return apiFetch<{ trackings: Tracking[] }>(
      `/tracking/history?start_date=${startDate}&end_date=${endDate}&limit=${limit}`,
    );
  },
  metrics(period: "7d" | "30d" | "90d") {
    return apiFetch<{ metrics: Record<string, number> }>(`/tracking/metrics?period=${period}`);
  },
};

