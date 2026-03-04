"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { usePlanStore } from "@/store/planStore";
import { planService } from "@/services/planService";
import { formatDate, formatTime } from "@/lib/date-helpers";
import { activityLabel, cn } from "@/lib/utils";

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function SleepBar({ sleepTime, wakeTime }: { sleepTime: string; wakeTime: string }) {
  const sh = parseInt(String(sleepTime).slice(0, 2), 10);
  const sm = parseInt(String(sleepTime).slice(3, 5) || "0", 10);
  const wh = parseInt(String(wakeTime).slice(0, 2), 10);
  const wm = parseInt(String(wakeTime).slice(3, 5) || "0", 10);

  const sleepMin = sh * 60 + sm;
  const wakeMin = wh * 60 + wm;
  let durationMin = wakeMin - sleepMin;
  if (durationMin < 0) durationMin += 24 * 60;

  const h = Math.floor(durationMin / 60);
  const m = durationMin % 60;

  const pct = Math.min(100, (durationMin / 540) * 100);

  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] text-muted mb-0.5">
        <span>🌙 {String(sleepTime).slice(0, 5)}</span>
        <span>{h}h{m > 0 ? ` ${m}m` : ""}</span>
        <span>☀️ {String(wakeTime).slice(0, 5)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-primary"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function PlanPage() {
  const schedules = usePlanStore((state) => state.schedules);
  const fetchCurrentPlan = usePlanStore((state) => state.fetchCurrentPlan);
  const isLoading = usePlanStore((state) => state.isLoading);
  const [generating, setGenerating] = useState(false);
  const [weekIndex, setWeekIndex] = useState(0);

  useEffect(() => {
    fetchCurrentPlan().catch(() => undefined);
  }, [fetchCurrentPlan]);

  const weeklyChunks = useMemo(() => {
    const chunks: typeof schedules[] = [];
    for (let i = 0; i < schedules.length; i += 7) {
      chunks.push(schedules.slice(i, i + 7));
    }
    return chunks;
  }, [schedules]);

  const currentWeek = weeklyChunks[weekIndex] ?? [];
  const canPrev = weekIndex > 0;
  const canNext = weekIndex < weeklyChunks.length - 1;

  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  async function generatePlan() {
    setGenerating(true);
    try {
      await planService.generate({ start_date: today });
      await fetchCurrentPlan();
    } catch {
      // error handled silently
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mobile-container space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-foreground">Plan Semanal</h1>
        {schedules.length > 0 && (
          <Button isLoading={generating} onClick={generatePlan} variant="outline">
            🔄 Regenerar
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div className="h-24 animate-pulse rounded-2xl bg-slate-100" key={i} />
          ))}
        </div>
      )}

      {!isLoading && schedules.length === 0 && (
        <Card className="text-center py-8">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-sm font-semibold text-foreground">No tienes un plan activo</p>
          <p className="mt-1 text-xs text-muted">Genera tu plan personalizado basado en tu cronotipo y obligaciones</p>
          <Button className="mt-4" isLoading={generating} onClick={generatePlan}>
            Generar mi plan
          </Button>
        </Card>
      )}

      {schedules.length > 0 && (
        <>
          {/* Week navigation */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-white px-3 py-2">
            <button
              className={cn("text-sm text-muted hover:text-foreground", !canPrev && "opacity-30 cursor-not-allowed")}
              disabled={!canPrev}
              onClick={() => setWeekIndex((p) => p - 1)}
              type="button"
            >
              ← Anterior
            </button>
            <p className="text-xs font-medium text-muted">
              Semana {weekIndex + 1} de {weeklyChunks.length}
            </p>
            <button
              className={cn("text-sm text-muted hover:text-foreground", !canNext && "opacity-30 cursor-not-allowed")}
              disabled={!canNext}
              onClick={() => setWeekIndex((p) => p + 1)}
              type="button"
            >
              Siguiente →
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {currentWeek.map((s, idx) => {
              const isToday = s.date === today;
              const dayLabel = DAY_LABELS[s.day_of_week ?? idx] ?? DAY_LABELS[idx];
              return (
                <div key={s.date}>
                  <p className="text-[10px] text-muted">{dayLabel}</p>
                  <div
                    className={cn(
                      "mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                      isToday ? "bg-primary text-white" : "text-foreground",
                    )}
                  >
                    {new Date(s.date + "T12:00:00").getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Schedule cards */}
          <div className="space-y-3">
            {currentWeek.map((schedule) => {
              const isToday = schedule.date === today;
              return (
                <div
                  className={cn(
                    "overflow-hidden rounded-2xl border bg-white shadow-sm",
                    isToday ? "border-primary/40 ring-1 ring-primary/20" : "border-border",
                  )}
                  key={schedule.date}
                >
                  <div className={cn("h-1", isToday ? "bg-primary" : "bg-slate-100")} />
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold capitalize">{formatDate(schedule.date)}</p>
                        {isToday && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            Hoy
                          </span>
                        )}
                      </div>
                      <Link
                        className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                        href={`/plan/${schedule.date}`}
                      >
                        Ver →
                      </Link>
                    </div>
                    <SleepBar
                      sleepTime={String(schedule.sleep_time ?? "23:00")}
                      wakeTime={String(schedule.wake_time ?? "07:00")}
                    />
                    {/* First few activities */}
                    <div className="mt-3 space-y-1">
                      {schedule.items.slice(0, 3).map((item, idx) => (
                        <div className="flex items-center gap-2 text-xs text-muted" key={idx}>
                          <span className="font-mono w-10">{formatTime(item.scheduled_time)}</span>
                          <span>{activityLabel(item.activity_type ?? "")}</span>
                        </div>
                      ))}
                      {schedule.items.length > 3 && (
                        <p className="text-xs text-primary">+{schedule.items.length - 3} más</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
