import { apiFetch } from "@/services/api";
import type { Obligation } from "@/types/domain";

type ObligationPayload = Omit<Obligation, "id" | "user_id" | "is_active" | "created_at">;

export const obligationService = {
  list() {
    return apiFetch<{ obligations: Obligation[] }>("/obligations");
  },
  create(payload: ObligationPayload) {
    return apiFetch<{ obligation: Obligation }>("/obligations", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update(id: string, payload: ObligationPayload) {
    return apiFetch<{ obligation: Obligation }>(`/obligations/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  remove(id: string) {
    return apiFetch<void>(`/obligations/${id}`, { method: "DELETE" });
  },
  checkConflicts(params: { start_time: string; end_time: string; days_of_week: number[] }) {
    const search = new URLSearchParams();
    search.set("start_time", params.start_time);
    search.set("end_time", params.end_time);
    params.days_of_week.forEach((day) => search.append("days_of_week", String(day)));
    return apiFetch<{ has_conflicts: boolean; conflicts: Obligation[] }>(
      `/obligations/check-conflicts?${search.toString()}`,
      { method: "POST" },
    );
  },
  importGoogleCalendar(params: {
    access_token: string;
    calendar_id: string;
    start_date: string;
    end_date: string;
  }) {
    // IMPORTANT: do not send access_token in URL (leaks via logs/history/proxies).
    return apiFetch<{ imported: number; obligations: Obligation[] }>(
      `/obligations/import-google-calendar`,
      { method: "POST", body: JSON.stringify(params) },
    );
  },
};

