"use client";

import { useUIStore } from "@/store/uiStore";

const tone = {
  success: "border-success bg-emerald-50 text-emerald-800",
  error: "border-error bg-red-50 text-red-800",
  warning: "border-warning bg-amber-50 text-amber-800",
  info: "border-primary bg-indigo-50 text-indigo-800",
} as const;

export function ToastStack() {
  const toasts = useUIStore((state) => state.toasts);
  const remove = useUIStore((state) => state.removeToast);
  if (!toasts.length) return null;

  return (
    <div aria-live="polite" className="fixed right-3 top-3 z-50 grid w-[min(360px,calc(100%-24px))] gap-2">
      {toasts.map((toast) => (
        <div className={`rounded-xl border px-3 py-2 text-sm ${tone[toast.type]}`} key={toast.id}>
          <div className="flex items-start justify-between gap-2">
            <p>{toast.message}</p>
            <button aria-label="Cerrar aviso" className="text-xs underline" onClick={() => remove(toast.id)} type="button">
              cerrar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

