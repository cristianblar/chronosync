import { apiFetch } from "@/services/api";

export interface NotificationSettings {
  wind_down_enabled: boolean;
  wind_down_minutes_before: number;
  tracking_reminder_enabled: boolean;
  tracking_reminder_time?: string | null;
  activity_reminders_enabled: boolean;
  max_per_day: number;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
}

export interface NotificationHistoryItem {
  id: string;
  type: string;
  title: string;
  body: string;
  deep_link?: string | null;
  scheduled_for: string;
  sent_at?: string | null;
  read_at?: string | null;
}

export const notificationService = {
  getSettings() {
    return apiFetch<{ settings: NotificationSettings }>("/notifications/settings");
  },
  updateSettings(payload: NotificationSettings) {
    return apiFetch<{ settings: NotificationSettings }>("/notifications/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  registerDevice(payload: { player_id: string; device_type: string }) {
    return apiFetch<{ status: string }>("/notifications/register-device", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  history(limit = 20) {
    return apiFetch<{ notifications: NotificationHistoryItem[] }>(
      `/notifications/history?limit=${limit}`,
    );
  },
};
