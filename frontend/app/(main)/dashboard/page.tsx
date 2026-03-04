"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";
import { usePlanStore } from "@/store/planStore";
import { trackingService } from "@/services/trackingService";
import { planService } from "@/services/planService";
import { formatTime } from "@/lib/date-helpers";
import { cn, activityLabel } from "@/lib/utils";
import type { ScheduleItem } from "@/types/domain";

const SleepQualityChart = dynamic(
  () => import("@/components/charts/SleepQualityChart").then((m) => m.SleepQualityChart),
  { ssr: false },
);

interface Metrics {
  avg_sleep_quality: number;
  avg_adherence: number;
  avg_social_jet_lag: number;
  avg_energy: number;
  trends: { sleep_quality: Array<{ date: string; value: number }> };
}

const EMPTY_METRICS: Metrics = {
  avg_sleep_quality: 0,
  avg_adherence: 0,
  avg_social_jet_lag: 0,
  avg_energy: 0,
  trends: { sleep_quality: [] },
};

function KpiCard({
  icon,
  label,
  value,
  unit = "",
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  unit?: string;
  accent?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-white p-4 shadow-sm", accent)}>
      <div className="mb-1 text-lg">{icon}</div>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-bold text-foreground">
        {value}<span className="text-sm font-normal text-muted">{unit}</span>
      </p>
    </div>
  );
}

const ACTIVITY_COLOR_MAP: Record<string, string> = {
  sleep: "bg-indigo-100 text-indigo-700",
  wake: "bg-amber-100 text-amber-700",
  light_exposure: "bg-green-100 text-green-700",
  exercise: "bg-emerald-100 text-emerald-700",
  meal: "bg-orange-100 text-orange-700",
  caffeine_cutoff: "bg-red-100 text-red-700",
  wind_down: "bg-violet-100 text-violet-700",
  work: "bg-blue-100 text-blue-700",
  obligation: "bg-blue-100 text-blue-700",
};

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const fetchToday = usePlanStore((state) => state.fetchToday);
  const countdown = usePlanStore((state) => state.todayCountdown);
  const [nextActivity, setNextActivity] = useState<ScheduleItem | null>(null);
  const [todayItems, setTodayItems] = useState<ScheduleItem[]>([]);
  const [metrics, setMetrics] = useState<Metrics>(EMPTY_METRICS);
  const [todaySchedule, setTodaySchedule] = useState<{ sleep_time?: string; wake_time?: string } | null>(null);

  useEffect(() => {
    fetchToday().catch(() => undefined);

    Promise.all([
      planService.today().then((r) => {
        setNextActivity(r.next_activity);
        setTodayItems(r.items ?? []);
        setTodaySchedule(r.schedule);
      }),
      trackingService.metrics("7d").then((r) => {
        if (r.metrics) setMetrics(r.metrics as unknown as Metrics);
      }),
    ])
      .catch(() => undefined);
  }, [fetchToday]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 20) return "Buenas tardes";
    return "Buenas noches";
  }, []);

  const firstName = user?.name?.split(" ")[0] ?? "Usuario";

  const qualityTrend = useMemo(
    () =>
      metrics.trends.sleep_quality.length
        ? metrics.trends.sleep_quality.map((item) => ({
            day: item.date.slice(5),
            value: Number(item.value.toFixed(1)),
          }))
        : [{ day: "Sin datos", value: 0 }],
    [metrics.trends.sleep_quality],
  );

  const countdownLabel = useMemo(() => {
    if (!countdown) return null;
    const h = Math.floor(countdown / 60);
    const m = countdown % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }, [countdown]);

  const today = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="mobile-container space-y-4">
      {/* Greeting header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="text-sm text-muted">{today}</p>
          <h1 className="text-xl font-bold text-foreground">{greeting}, {firstName}</h1>
          <p className="text-sm text-muted">Veamos tu plan de hoy</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-lg font-bold text-white shadow-sm">
          {(user?.name ?? "U")[0].toUpperCase()}
        </div>
      </div>

      {/* Hero plan card */}
      <div className="rounded-2xl gradient-hero p-5 text-white shadow-md">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">PLAN DE HOY</p>
        {nextActivity ? (
          <>
            <p className="mt-2 text-sm opacity-90">
              Próximo: <span className="font-semibold">{activityLabel(nextActivity.activity_type ?? "")}</span>
            </p>
            {countdownLabel && (
              <p className="mt-1 text-3xl font-bold">{countdownLabel}</p>
            )}
            <p className="mt-1 text-sm opacity-80">a las {formatTime(nextActivity.scheduled_time)}</p>
          </>
        ) : (
          <p className="mt-2 text-sm opacity-90">Sin actividades próximas planificadas</p>
        )}
        {/* Time pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          {todaySchedule?.wake_time && (
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
              ☀️ {String(todaySchedule.wake_time).slice(0, 5)}
            </span>
          )}
          {todaySchedule?.sleep_time && (
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
              🌙 {String(todaySchedule.sleep_time).slice(0, 5)}
            </span>
          )}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          icon="😴"
          label="Calidad Sueño"
          value={metrics.avg_sleep_quality.toFixed(1)}
          unit="/10"
        />
        <KpiCard
          icon="✅"
          label="Adherencia"
          value={Math.round(metrics.avg_adherence).toString()}
          unit="%"
        />
        <KpiCard
          icon="✈️"
          label="Jet Lag Social"
          value={Math.round(metrics.avg_social_jet_lag).toString()}
          unit=" min"
        />
        <KpiCard
          icon="⚡"
          label="Energía Media"
          value={metrics.avg_energy.toFixed(1)}
          unit="/10"
        />
      </div>

      {/* Today's activities */}
      {todayItems.length > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold">Hoy</h2>
          <div className="space-y-2">
            {todayItems.slice(0, 5).map((item, idx) => {
              const colorClass = ACTIVITY_COLOR_MAP[item.activity_type ?? ""] ?? "bg-slate-100 text-slate-700";
              return (
                <div className="flex items-center gap-3" key={idx}>
                  <span className="text-xs text-muted w-10 flex-shrink-0 font-mono">
                    {formatTime(item.scheduled_time)}
                  </span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", colorClass)}>
                    {activityLabel(item.activity_type ?? "")}
                  </span>
                </div>
              );
            })}
            {todayItems.length > 5 && (
              <Link className="text-xs text-primary hover:underline" href="/plan">
                Ver plan completo →
              </Link>
            )}
          </div>
        </Card>
      )}

      {/* Sleep quality chart */}
      <Card>
        <h2 className="mb-3 font-semibold">Calidad de sueño — últimos 7 días</h2>
        <SleepQualityChart data={qualityTrend} />
      </Card>

      {/* Tip card */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-xs font-semibold text-primary uppercase tracking-wider">Consejo del día</p>
        <p className="mt-1 text-sm text-foreground">
          {metrics.avg_adherence < 70
            ? "Tu adherencia está por debajo del objetivo. Intenta mantener el mismo horario los fines de semana."
            : metrics.avg_sleep_quality < 6
            ? "Tu calidad de sueño puede mejorar. Revisa tu rutina de relajación 30 minutos antes de dormir."
            : "¡Vas por buen camino! La regularidad en los horarios es la clave del éxito."}
        </p>
      </div>

      {/* Quick action */}
      <Link href="/tracking">
        <Button className="w-full">
          📊 Registro rápido de hoy
        </Button>
      </Link>
    </div>
  );
}
