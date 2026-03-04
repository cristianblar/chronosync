"use client";

import { create } from "zustand";
import { authService } from "@/services/authService";
import { userService } from "@/services/userService";
import { chronotypeService } from "@/services/chronotypeService";
import type { User } from "@/types/domain";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  onboardingComplete: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    timezone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setOnboardingComplete: () => void;
  setUser: (user: User) => void;
}

function persistTokens(access: string, refresh: string) {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
  // Set cookies for middleware to read (no httpOnly so JS can set it)
  document.cookie = `access_token=${access}; path=/; max-age=${15 * 60}; samesite=lax`;
  document.cookie = `refresh_token=${refresh}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;
}

function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("onboarding_complete");
  document.cookie = "access_token=; path=/; max-age=0";
  document.cookie = "refresh_token=; path=/; max-age=0";
  document.cookie = "onboarding_complete=; path=/; max-age=0";
}

function markOnboardingDone() {
  localStorage.setItem("onboarding_complete", "1");
  document.cookie = "onboarding_complete=1; path=/; max-age=" + (365 * 24 * 60 * 60);
}

async function checkOnboardingStatus(): Promise<boolean> {
  // If already flagged locally, re-set the cookie (cleared on logout) and trust it
  if (localStorage.getItem("onboarding_complete") === "1") {
    markOnboardingDone();
    return true;
  }
  try {
    const r = await chronotypeService.getCurrent();
    if (r?.assessment) {
      markOnboardingDone();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  onboardingComplete: false,

  setOnboardingComplete: () => {
    markOnboardingDone();
    set({ onboardingComplete: true });
  },

  hydrate: async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    set({ isLoading: true, error: null });
    try {
      const user = await userService.me();
      const onboardingComplete = await checkOnboardingStatus();
      set({ user, isAuthenticated: true, onboardingComplete });
    } catch {
      clearTokens();
      set({ user: null, isAuthenticated: false, onboardingComplete: false });
    } finally {
      set({ isLoading: false });
    }
  },

  loginWithGoogle: async (idToken) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.google(idToken);
      persistTokens(response.access_token, response.refresh_token);
      const onboardingComplete = await checkOnboardingStatus();
      set({ user: response.user, isAuthenticated: true, onboardingComplete });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "No se pudo autenticar con Google",
      });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.login({ email, password });
      persistTokens(response.access_token, response.refresh_token);
      const onboardingComplete = await checkOnboardingStatus();
      set({ user: response.user, isAuthenticated: true, onboardingComplete });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "No se pudo iniciar sesión" });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.register(payload);
      persistTokens(response.access_token, response.refresh_token);
      set({ user: response.user, isAuthenticated: true, onboardingComplete: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "No se pudo registrar" });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  setUser: (user: User) => {
    set({ user });
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
    } finally {
      clearTokens();
      set({ isLoading: false, user: null, isAuthenticated: false, onboardingComplete: false });
    }
  },
}));
