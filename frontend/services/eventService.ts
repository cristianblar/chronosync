import { apiFetch } from "@/services/api";
import type { Event } from "@/types/domain";

type EventPayload = Omit<Event, "id" | "user_id" | "preparation_days" | "created_at">;

export const eventService = {
  list(includePast = false) {
    return apiFetch<{ events: Event[] }>(`/events?include_past=${includePast}`);
  },
  create(payload: EventPayload) {
    return apiFetch<{ event: Event; preparation_plan: unknown | null }>("/events", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update(id: string, payload: EventPayload) {
    return apiFetch<{ event: Event }>(`/events/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  remove(id: string) {
    return apiFetch<void>(`/events/${id}`, { method: "DELETE" });
  },
};

