import { apiFetch } from "@/services/api";
import type { User } from "@/types/domain";

export const userService = {
  me() {
    return apiFetch<User>("/users/me");
  },
  update(payload: Partial<Pick<User, "name" | "timezone" | "language">>) {
    return apiFetch<User>("/users/me", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  exportData() {
    return apiFetch<Record<string, unknown>>("/users/me/export");
  },
  deleteAccount(currentPassword?: string) {
    return apiFetch<void>("/users/me", {
      method: "DELETE",
      body: JSON.stringify(currentPassword ? { current_password: currentPassword } : {}),
    });
  },
  updateConsent(payload: {
    analytics_consent: boolean;
    marketing_consent: boolean;
    research_consent: boolean;
  }) {
    return apiFetch("/users/me/consent", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
};

