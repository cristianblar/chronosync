"use client";

import { create } from "zustand";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface UIState {
  toasts: ToastMessage[];
  disclaimerAccepted: boolean;
  pushToast: (toast: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;
  setDisclaimerAccepted: (value: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  disclaimerAccepted: false,
  pushToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }],
    })),
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
  setDisclaimerAccepted: (value) => set({ disclaimerAccepted: value }),
}));
