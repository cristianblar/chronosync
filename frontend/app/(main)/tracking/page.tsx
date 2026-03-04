"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useTrackingStore } from "@/store/trackingStore";
import { planService } from "@/services/planService";
import { getOfflineQueue, replayOfflineQueue } from "@/lib/offline-sync";
import { cn } from "@/lib/utils";

// ─── Dark Time Picker Card ────────────────────────────────────────────────────
function DarkTimePicker({
  label,
  value,
  onChange,
  accent = "text-primary",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-900 p-5 text-white">
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</p>
      <div className="mt-3 flex items-center justify-center">
        <input
          className={cn(
            "bg-transparent text-center text-4xl font-bold outline-none",
            "[&::-webkit-calendar-picker-indicator]:hidden",
            accent,
          )}
          onChange={(e) => onChange(e.target.value)}
          type="time"
          value={value.slice(0, 5)}
        />
      </div>
      <p className="mt-2 text-center text-xs text-slate-500">HORA / MIN</p>
    </div>
  );
}

// ─── Energy emoji scale ───────────────────────────────────────────────────────
const ENERGY_EMOJIS = ["😫", "😒", "😐", "😊", "😄"];
const ENERGY_LABELS = ["Sin energía", "Bajo", "Neutral", "Bien", "Excelente"];

const TIME_PERIODS = [
  { key: "early_morning", label: "06-09", sublabel: "Mañana" },
  { key: "morning", label: "09-12", sublabel: "Mediodía" },
  { key: "midday", label: "12-15", sublabel: "Mediodía" },
  { key: "afternoon", label: "15-18", sublabel: "Tarde" },
  { key: "evening", label: "18-22", sublabel: "Noche" },
] as const;

type PeriodKey = (typeof TIME_PERIODS)[number]["key"];

const QUICK_TAGS = [
  { key: "cafe", label: "☕ Café" },
  { key: "ejercicio", label: "🏋️ Ejercicio" },
  { key: "estres", label: "😰 Estrés" },
  { key: "comida_pesada", label: "🍕 Comida pesada" },
  { key: "pantallas", label: "📱 Pantallas" },
];

function getPeriodKeyFromHour(h: number): PeriodKey {
  if (h < 9) return "early_morning";
  if (h < 12) return "morning";
  if (h < 15) return "midday";
  if (h < 18) return "afternoon";
  return "evening";
}

// ─── Confirmation screen ──────────────────────────────────────────────────────
function ConfirmationScreen({
  adherence,
  duration,
  plannedSleep,
  plannedWake,
  actualSleep,
  actualWake,
  onDismiss,
}: {
  adherence: number;
  duration: string;
  plannedSleep: string | null;
  plannedWake: string | null;
  actualSleep: string;
  actualWake: string;
  onDismiss: () => void;
}) {
  function diffLabel(planned: string | null, actual: string) {
    if (!planned) return null;
    const [ph, pm] = planned.split(":").map(Number);
    const [ah, am] = actual.split(":").map(Number);
    const diff = ah * 60 + am - (ph * 60 + pm);
    if (diff === 0) return { label: "✓ En punto", color: "text-success" };
    return {
      label: `${diff > 0 ? "+" : ""}${diff} min`,
      color: Math.abs(diff) <= 30 ? "text-warning" : "text-error",
    };
  }

  const sleepDiff = diffLabel(plannedSleep, actualSleep);
  const wakeDiff = diffLabel(plannedWake, actualWake);

  return (
    <div className="mobile-container space-y-6 animate-fade-in">
      {/* Success hero */}
      <div className="rounded-2xl bg-success/10 p-6 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
          <svg className="h-8 w-8 text-success" fill="currentColor" viewBox="0 0 20 20">
            <path clipRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fillRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground">¡Registro completado!</h2>
        <p className="mt-1 text-sm text-muted">Gracias por registrar tu sueño. Estos datos nos ayudan a optimizar tu plan.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white border border-border p-4 text-center shadow-sm">
          <p className="text-xs text-muted">Duración</p>
          <p className="text-2xl font-bold text-foreground">{duration}</p>
        </div>
        <div className="rounded-2xl bg-white border border-border p-4 text-center shadow-sm">
          <p className="text-xs text-muted">Adherencia</p>
          <p className={cn("text-2xl font-bold", adherence >= 80 ? "text-success" : adherence >= 60 ? "text-warning" : "text-error")}>
            {adherence}%
          </p>
        </div>
      </div>

      {/* Plan vs real comparison */}
      {(plannedSleep || plannedWake) && (
        <Card>
          <h3 className="mb-3 font-semibold">Plan vs Real</h3>
          <div className="space-y-2">
            {plannedSleep && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">🌙 Hora de dormir</span>
                <div className="flex items-center gap-2">
                  <span className="text-foreground">{actualSleep.slice(0, 5)}</span>
                  {sleepDiff && (
                    <span className={cn("text-xs font-semibold rounded-full px-2 py-0.5 bg-slate-100", sleepDiff.color)}>
                      {sleepDiff.label}
                    </span>
                  )}
                </div>
              </div>
            )}
            {plannedWake && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">☀️ Hora de despertar</span>
                <div className="flex items-center gap-2">
                  <span className="text-foreground">{actualWake.slice(0, 5)}</span>
                  {wakeDiff && (
                    <span className={cn("text-xs font-semibold rounded-full px-2 py-0.5 bg-slate-100", wakeDiff.color)}>
                      {wakeDiff.label}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      <Button className="w-full" onClick={onDismiss}>
        Continuar al dashboard
      </Button>
    </div>
  );
}

// ─── Main tracking page ───────────────────────────────────────────────────────

export default function TrackingPage() {
  const submit = useTrackingStore((state) => state.submit);
  const isLoading = useTrackingStore((state) => state.isLoading);
  const [planTimes, setPlanTimes] = useState<{ sleep: string | null; wake: string | null }>({ sleep: null, wake: null });
  const [pendingOffline, setPendingOffline] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activePeriod, setActivePeriod] = useState<PeriodKey>(() => getPeriodKeyFromHour(new Date().getHours()));
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [form, setForm] = useState({
    actual_sleep_time: "23:30",
    actual_wake_time: "07:00",
    sleep_quality: 7,
    energy_levels: {
      early_morning: 6,
      morning: 7,
      midday: 6,
      afternoon: 7,
      evening: 6,
    },
    notes: "",
  });

  useEffect(() => {
    planService.today()
      .then((r) => setPlanTimes({ sleep: r.schedule?.sleep_time ?? null, wake: r.schedule?.wake_time ?? null }))
      .catch(() => {});

    getOfflineQueue().then((q) => setPendingOffline(q.length)).catch(() => {});
  }, []);

  const duration = useMemo(() => {
    const [sh, sm] = form.actual_sleep_time.split(":").map(Number);
    const [wh, wm] = form.actual_wake_time.split(":").map(Number);
    let diff = (wh * 60 + wm) - (sh * 60 + sm);
    if (diff < 0) diff += 24 * 60;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h}h ${m}m`;
  }, [form.actual_sleep_time, form.actual_wake_time]);

  const adherenceEstimate = useMemo(() => {
    function diffMin(planned: string | null, actual: string) {
      if (!planned) return 0;
      const [ph, pm] = String(planned).split(":").map(Number);
      const [ah, am] = actual.split(":").map(Number);
      return Math.abs(ah * 60 + am - (ph * 60 + pm));
    }
    const sleepPenalty = Math.min(diffMin(planTimes.sleep, form.actual_sleep_time), 120) / 120;
    const wakePenalty = Math.min(diffMin(planTimes.wake, form.actual_wake_time), 120) / 120;
    const qualityBonus = form.sleep_quality / 10;
    return Math.max(0, Math.min(100, Math.round((1 - (sleepPenalty + wakePenalty) / 2) * 70 + qualityBonus * 30)));
  }, [form, planTimes]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const notes = selectedTags.length > 0
      ? `${selectedTags.join(", ")}${form.notes ? ` | ${form.notes}` : ""}`
      : form.notes;

    await submit({
      ...form,
      actual_sleep_time: `${form.actual_sleep_time}:00`,
      actual_wake_time: `${form.actual_wake_time}:00`,
      notes,
      date: new Date().toISOString().slice(0, 10),
    });
    setSubmitted(true);
  }

  async function syncPending() {
    setIsSyncing(true);
    await replayOfflineQueue();
    const q = await getOfflineQueue();
    setPendingOffline(q.length);
    setIsSyncing(false);
  }

  const currentEnergyLevel = (form.energy_levels as Record<string, number>)[activePeriod] ?? 5;
  const emojiIdx = Math.min(Math.floor(((currentEnergyLevel - 1) / 9) * 5), 4);

  if (submitted) {
    return (
      <ConfirmationScreen
        adherence={adherenceEstimate}
        duration={duration}
        plannedSleep={planTimes.sleep ? String(planTimes.sleep).slice(0, 5) : null}
        plannedWake={planTimes.wake ? String(planTimes.wake).slice(0, 5) : null}
        actualSleep={form.actual_sleep_time}
        actualWake={form.actual_wake_time}
        onDismiss={() => (window.location.href = "/dashboard")}
      />
    );
  }

  return (
    <div className="mobile-container space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Registro Matutino</h1>
        <p className="text-sm text-muted">Completa en menos de 2 minutos</p>
      </div>

      {/* Plan vs estimate bar */}
      {(planTimes.sleep || planTimes.wake) && (
        <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
          <p className="text-xs text-primary font-medium">Adherencia estimada: {adherenceEstimate}%</p>
          <div className="mt-1.5 h-1.5 rounded-full bg-primary/20">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${adherenceEstimate}%` }}
            />
          </div>
        </div>
      )}

      <form className="space-y-4" onSubmit={onSubmit}>
        {/* Sleep time - dark card */}
        <DarkTimePicker
          label="¿A qué hora te dormiste?"
          value={form.actual_sleep_time}
          onChange={(v) => setForm((p) => ({ ...p, actual_sleep_time: v }))}
          accent="text-primary"
        />

        {/* Wake time - dark card */}
        <DarkTimePicker
          label="¿A qué hora despertaste?"
          value={form.actual_wake_time}
          onChange={(v) => setForm((p) => ({ ...p, actual_wake_time: v }))}
          accent="text-amber-400"
        />

        {/* Duration display */}
        <div className="text-center">
          <span className="rounded-full bg-success/10 px-4 py-1.5 text-sm font-semibold text-success">
            ⏱ Duración: {duration}
          </span>
        </div>

        {/* Sleep quality */}
        <Card>
          <h2 className="mb-3 font-semibold">Calidad de sueño</h2>
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                className={cn(
                  "h-9 rounded-lg text-sm font-semibold transition",
                  form.sleep_quality === n
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-muted hover:bg-primary/10 hover:text-primary",
                )}
                key={n}
                onClick={() => setForm((p) => ({ ...p, sleep_quality: n }))}
                type="button"
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted">
            <span>Muy malo</span>
            <span>Excelente</span>
          </div>
        </Card>

        {/* Energy level */}
        <Card>
          <h2 className="mb-3 font-semibold">Nivel de energía</h2>
          {/* Period selector */}
          <div className="mb-3 flex gap-1 overflow-x-auto pb-1">
            {TIME_PERIODS.map((p) => (
              <button
                className={cn(
                  "flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition whitespace-nowrap",
                  activePeriod === p.key
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-muted hover:bg-primary/10",
                )}
                key={p.key}
                onClick={() => setActivePeriod(p.key)}
                type="button"
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Emoji scale */}
          <div className="flex items-end justify-between px-2">
            {ENERGY_EMOJIS.map((emoji, idx) => (
              <button
                className={cn(
                  "flex flex-col items-center gap-0.5 transition",
                  emojiIdx === idx ? "scale-125" : "opacity-40 hover:opacity-70",
                )}
                key={idx}
                onClick={() => {
                  const val = Math.round(((idx + 0.5) / 5) * 9) + 1;
                  setForm((p) => ({
                    ...p,
                    energy_levels: { ...p.energy_levels, [activePeriod]: val },
                  }));
                }}
                type="button"
              >
                <span className="text-2xl">{emoji}</span>
                <span className="text-[9px] text-muted">{idx + 1}</span>
              </button>
            ))}
          </div>
          <p className="mt-1 text-center text-xs text-muted">{ENERGY_LABELS[emojiIdx]}</p>
        </Card>

        {/* Quick tags */}
        <Card>
          <h2 className="mb-3 font-semibold text-sm">Notas rápidas (opcional)</h2>
          <div className="flex flex-wrap gap-2">
            {QUICK_TAGS.map((tag) => {
              const active = selectedTags.includes(tag.key);
              return (
                <button
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-white text-muted hover:border-primary/50",
                  )}
                  key={tag.key}
                  onClick={() =>
                    setSelectedTags((t) =>
                      active ? t.filter((k) => k !== tag.key) : [...t, tag.key],
                    )
                  }
                  type="button"
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </Card>

        <Button className="w-full" isLoading={isLoading} type="submit">
          Guardar registro
        </Button>
      </form>

      <Link href="/tracking/history">
        <Button className="w-full" variant="outline">Ver historial →</Button>
      </Link>

      {pendingOffline > 0 && (
        <Card className="border-warning/40 bg-amber-50">
          <p className="text-xs text-warning">
            {pendingOffline} registro{pendingOffline !== 1 ? "s" : ""} pendiente{pendingOffline !== 1 ? "s" : ""} de sincronización
          </p>
          <Button className="mt-2" isLoading={isSyncing} onClick={syncPending} type="button" variant="outline">
            Sincronizar ahora
          </Button>
        </Card>
      )}
    </div>
  );
}
