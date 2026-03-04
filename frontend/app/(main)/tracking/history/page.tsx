"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTrackingStore } from "@/store/trackingStore";
import { cn } from "@/lib/utils";

const WEEK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function AdherenceBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const color = pct >= 90 ? "bg-success/10 text-success" : pct >= 70 ? "bg-warning/10 text-warning" : "bg-error/10 text-error";
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", color)}>
      {Math.round(pct)}%
    </span>
  );
}

export default function TrackingHistoryPage() {
  const history = useTrackingStore((state) => state.history);
  const fetchHistory = useTrackingStore((state) => state.fetchHistory);
  const [weekOffset, setWeekOffset] = useState(0);

  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    end.setDate(end.getDate() - weekOffset * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }, [weekOffset]);

  useEffect(() => {
    fetchHistory(startDate, endDate).catch(() => undefined);
  }, [fetchHistory, startDate, endDate]);

  // Build a map from date to tracking
  const byDate = useMemo(() => {
    const map: Record<string, (typeof history)[number]> = {};
    history.forEach((h) => { map[h.date] = h; });
    return map;
  }, [history]);

  // Build week days array
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, [startDate]);

  return (
    <div className="mobile-container space-y-4">
      <div className="flex items-center gap-3">
        <Link
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-muted hover:bg-primary/5"
          href="/tracking"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold text-foreground">Historial</h1>
      </div>

      {/* Week selector */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-white px-3 py-2">
        <button
          className="text-sm text-muted hover:text-foreground"
          onClick={() => setWeekOffset((w) => w + 1)}
          type="button"
        >
          ← Anterior
        </button>
        <p className="text-xs font-medium text-muted">
          {startDate} – {endDate}
        </p>
        <button
          className={cn("text-sm text-muted hover:text-foreground", weekOffset === 0 && "opacity-30 cursor-not-allowed")}
          disabled={weekOffset === 0}
          onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
          type="button"
        >
          Siguiente →
        </button>
      </div>

      {/* Week day pills */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekDates.map((date, idx) => {
          const hasData = Boolean(byDate[date]);
          const isToday = date === new Date().toISOString().slice(0, 10);
          return (
            <div key={date}>
              <p className="text-[10px] text-muted">{WEEK_DAYS[idx]}</p>
              <div
                className={cn(
                  "mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-xs",
                  isToday ? "bg-primary text-white font-bold" : hasData ? "bg-primary/10 text-primary" : "text-muted",
                )}
              >
                {new Date(date + "T12:00:00").getDate()}
              </div>
              {hasData && <div className="mx-auto mt-0.5 h-1 w-1 rounded-full bg-primary" />}
            </div>
          );
        })}
      </div>

      {/* Entries */}
      <div className="space-y-3">
        {history.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted">No hay registros para esta semana.</p>
          </div>
        ) : (
          history.map((item) => {
            const dateLabel = new Date(item.date + "T12:00:00").toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "short",
            });

            const sh = item.actual_sleep_time?.slice(0, 2) ? parseInt(item.actual_sleep_time.slice(0, 2)) : null;
            const sm = item.actual_sleep_time ? parseInt(item.actual_sleep_time.slice(3, 5) || "0") : 0;
            const wh = item.actual_wake_time?.slice(0, 2) ? parseInt(item.actual_wake_time.slice(0, 2)) : null;
            const wm = item.actual_wake_time ? parseInt(item.actual_wake_time.slice(3, 5) || "0") : 0;

            let durationLabel = "—";
            if (sh !== null && wh !== null) {
              let diff = (wh * 60 + wm) - (sh * 60 + sm);
              if (diff < 0) diff += 24 * 60;
              const h = Math.floor(diff / 60);
              const m = diff % 60;
              durationLabel = `${h}h${m > 0 ? ` ${m}m` : ""}`;
            }

            return (
              <div
                className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
                key={item.id}
              >
                <div className="h-1 bg-gradient-to-r from-primary to-secondary" />
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold capitalize">{dateLabel}</p>
                    <AdherenceBadge pct={item.adherence_percentage ?? null} />
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-[10px] text-muted">🌙 Dormido</p>
                      <p className="text-sm font-semibold">{item.actual_sleep_time?.slice(0, 5) ?? "—"}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-[10px] text-muted">⏱ Duración</p>
                      <p className="text-sm font-semibold">{durationLabel}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-[10px] text-muted">☀️ Despertar</p>
                      <p className="text-sm font-semibold">{item.actual_wake_time?.slice(0, 5) ?? "—"}</p>
                    </div>
                  </div>
                  {item.sleep_quality && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-muted">Calidad:</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 10 }, (_, i) => (
                          <div
                            className={cn(
                              "h-1.5 w-3 rounded-full",
                              i < item.sleep_quality! ? "bg-primary" : "bg-slate-100",
                            )}
                            key={i}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-medium">{item.sleep_quality}/10</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
