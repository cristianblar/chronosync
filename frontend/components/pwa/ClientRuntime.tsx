"use client";

import { useEffect } from "react";
import { replayOfflineQueue } from "@/lib/offline-sync";
import { initOneSignal } from "@/lib/push";

export function ClientRuntime() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const onOnline = () => {
      replayOfflineQueue().catch(() => undefined);
    };
    window.addEventListener("online", onOnline);
    replayOfflineQueue().catch(() => undefined);
    initOneSignal().catch(() => undefined);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return null;
}
