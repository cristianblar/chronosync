import { apiFetch, clearTokens } from "@/services/api";
import type { AuthResponse } from "@/types/domain";

export const authService = {
  register(payload: { name: string; email: string; password: string; timezone?: string }) {
    return apiFetch<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }, false);
  },
  login(payload: { email: string; password: string }) {
    return apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }, false);
  },
  google(idToken: string) {
    return apiFetch<AuthResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ id_token: idToken }),
    }, false);
  },
  forgotPassword(email: string) {
    return apiFetch("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }, false);
  },
  resetPassword(payload: { token: string; password: string }) {
    return apiFetch("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }, false);
  },
  verifyEmail(token: string) {
    return apiFetch("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    }, false);
  },
  async logout() {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } finally {
      clearTokens();
    }
  },
};
