"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { usePlanStore } from "@/store/planStore";
import { formatTime } from "@/lib/date-helpers";
import { activityLabel, cn } from "@/lib/utils";

const ACTIVITY_COLORS: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  sleep: { bg: "bg-indigo-900", text: "text-indigo-100", border: "border-indigo-700", icon: "🌙" },
  wake: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", icon: "☀️" },
  light_exposure: { bg: "bg-green-50", text: "text-green-800", border: "border-green-200", icon: "💡" },
  exercise: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", icon: "🏃" },
  meal: { bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200", icon: "🍽" },
  caffeine_cutoff: { bg: "bg-red-50", text: "text-red-800", border: "border-red-200", icon: "☕" },
  caffeine: { bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200", icon: "☕" },
  wind_down: { bg: "bg-violet-50", text: "text-violet-800", border: "border-violet-200", icon: "🌆" },
  work: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200", icon: "💼" },
  obligation: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200", icon: "📌" },
};

function getActivityStyle(type: string) {
  return ACTIVITY_COLORS[type] ?? { bg: "bg-slate-50", text: "text-slate-800", border: "border-slate-200", icon: "⏰" };
}

export default function PlanDayPage() {
  const params = useParams<{ date: string }>();
  const schedules = usePlanStore((state) => state.schedules);
  const fetchCurrentPlan = usePlanStore((state) => state.fetchCurrentPlan);
  const [openRationale, setOpenRationale] = useState<Record<string, boolean>>({});

  const schedule = useMemo(
    () => schedules.find((s) => s.date === params.date),
    [params.date, schedules],
  );

  useEffect(() => {
    fetchCurrentPlan().catch(() => undefined);
  }, [fetchCurrentPlan]);

  const dateLabel = useMemo(() => {
    if (!params.date) return "";
    try {
      return new Date(params.date).toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    } catch {
      return params.date;
    }
  }, [params.date]);

  return (
    <div className="mobile-container space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-muted hover:bg-primary/5"
          href="/plan"
        >
          ←
        </Link>
        <div>
          <h1 className="text-lg font-bold text-foreground capitalize">{dateLabel}</h1>
          {schedule && (
            <p className="text-xs text-muted">
              🌙 {String(schedule.sleep_time ?? "").slice(0, 5)} · ☀️ {String(schedule.wake_time ?? "").slice(0, 5)}
            </p>
          )}
        </div>
      </div>

      {!schedule ? (
        <Card>
          <p className="text-sm text-muted">No hay plan disponible para este día. Genera tu plan primero.</p>
          <Link className="mt-2 block text-sm text-primary hover:underline" href="/plan">
            Ir al plan →
          </Link>
        </Card>
      ) : (
        <div className="relative space-y-2 pl-8">
          {/* Timeline line */}
          <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-border rounded-full" />

          {schedule.items
            .slice()
            .sort((a, b) => String(a.scheduled_time).localeCompare(String(b.scheduled_time)))
            .map((item, idx) => {
              const style = getActivityStyle(item.activity_type ?? "");
              const key = `${item.activity_type}-${idx}`;
              return (
                <div className="relative" key={key}>
                  {/* Timeline dot */}
                  <div className="absolute -left-[26px] top-4 h-3 w-3 rounded-full border-2 border-white bg-primary shadow-sm" />

                  <div
                    className={cn(
                      "rounded-2xl border p-4 transition",
                      style.bg,
                      style.border,
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{style.icon}</span>
                        <div>
                          <p className={cn("text-sm font-semibold", style.text)}>
                            {activityLabel(item.activity_type ?? "")}
                          </p>
                          <p className={cn("text-xs opacity-70", style.text)}>
                            {formatTime(item.scheduled_time)}
                            {item.duration_minutes ? ` · ${item.duration_minutes} min` : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                    {item.notes && (
                      <p className={cn("mt-2 text-xs opacity-80", style.text)}>{item.notes}</p>
                    )}
                    {item.scientific_rationale && (
                      <>
                        <button
                          className="mt-2 text-xs text-primary hover:underline"
                          onClick={() =>
                            setOpenRationale((p) => ({ ...p, [key]: !p[key] }))
                          }
                          type="button"
                        >
                          {openRationale[key] ? "Ocultar fundamento ↑" : "Ver fundamento científico ↓"}
                        </button>
                        {openRationale[key] && (
                          <p className="mt-1 text-xs text-muted italic border-l-2 border-primary/30 pl-2">
                            {item.scientific_rationale}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
