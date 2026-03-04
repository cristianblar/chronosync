"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function LogoutButton() {
  const logout = useAuthStore((s) => s.logout);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    setLoading(true);
    await logout();
    router.push("/login");
  }

  return (
    <div className="mt-2">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Sesión</p>
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <button
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition disabled:opacity-50"
          disabled={loading}
          onClick={handleLogout}
        >
          <span className="text-xl w-8 text-center">🚪</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-500">{loading ? "Cerrando sesión…" : "Cerrar sesión"}</p>
          </div>
        </button>
      </div>
    </div>
  );
}
