"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { obligationService } from "@/services/obligationService";
import { useOnboardingStore } from "@/store/onboardingStore";
import type { ObligationType } from "@/types/domain";
import { cn } from "@/lib/utils";

const DAYS = [
  { key: 0, label: "L" },
  { key: 1, label: "M" },
  { key: 2, label: "X" },
  { key: 3, label: "J" },
  { key: 4, label: "V" },
  { key: 5, label: "S" },
  { key: 6, label: "D" },
];

const OBLIGATION_TYPES: { value: ObligationType; label: string; icon: string; color: string }[] = [
  { value: "work", label: "Trabajo", icon: "💼", color: "bg-blue-50 border-blue-200 text-blue-700" },
  { value: "class", label: "Estudios", icon: "📚", color: "bg-purple-50 border-purple-200 text-purple-700" },
  { value: "health", label: "Salud", icon: "🏃", color: "bg-green-50 border-green-200 text-green-700" },
  { value: "family", label: "Familia", icon: "👨‍👩‍👧", color: "bg-orange-50 border-orange-200 text-orange-700" },
  { value: "other", label: "Otros", icon: "📌", color: "bg-slate-50 border-slate-200 text-slate-700" },
];

function getTypeInfo(type: string) {
  return OBLIGATION_TYPES.find((t) => t.value === type) ?? OBLIGATION_TYPES[4];
}

interface ConflictInfo {
  name: string;
  start_time?: string;
  end_time?: string;
}

export default function ObligationsPage() {
  const router = useRouter();
  const obligations = useOnboardingStore((state) => state.obligations);
  const addObligation = useOnboardingStore((state) => state.addObligation);
  const removeObligation = useOnboardingStore((state) => state.removeObligation);

  const [form, setForm] = useState({
    name: "",
    type: "work" as ObligationType,
    start_time: "09:00",
    end_time: "10:00",
    days_of_week: [0, 1, 2, 3, 4] as number[],
    is_recurring: true,
  });
  const [saving, setSaving] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);

  const hasTimeError = useMemo(
    () => form.start_time >= form.end_time,
    [form.start_time, form.end_time],
  );

  const canSave = !hasTimeError && form.days_of_week.length > 0 && form.name.trim().length > 0;

  async function addItem() {
    if (!canSave) return;
    setSaving(true);
    setConflicts([]);
    try {
      const conflict = await obligationService.checkConflicts({
        start_time: `${form.start_time}:00`,
        end_time: `${form.end_time}:00`,
        days_of_week: form.days_of_week,
      });
      if (conflict.has_conflicts) {
        setConflicts(conflict.conflicts as ConflictInfo[]);
        return;
      }
      const response = await obligationService.create({
        name: form.name,
        type: form.type,
        start_time: `${form.start_time}:00`,
        end_time: `${form.end_time}:00`,
        days_of_week: form.days_of_week,
        is_recurring: form.is_recurring,
        valid_from: new Date().toISOString().slice(0, 10),
        valid_until: null,
      });
      addObligation(response.obligation);
      setForm((prev) => ({ ...prev, name: "" }));
    } catch {
      // Handle error silently - user will retry
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mobile-container space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mis Obligaciones</h1>
        <p className="mt-1 text-sm text-muted">Añade tus compromisos recurrentes para que el plan los respete.</p>
      </div>

      {/* Add obligation form */}
      <Card className="space-y-4">
        <h2 className="font-semibold">Nueva obligación</h2>
        <Input
          label="Nombre"
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="Ej: Trabajo, Clases, Gimnasio…"
          value={form.name}
        />

        {/* Type selector */}
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Tipo</p>
          <div className="grid grid-cols-5 gap-2">
            {OBLIGATION_TYPES.map((t) => (
              <button
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border p-2 text-xs transition",
                  form.type === t.value
                    ? `${t.color} border-current`
                    : "border-border bg-white text-muted hover:border-primary/50",
                )}
                key={t.value}
                onClick={() => setForm((p) => ({ ...p, type: t.value }))}
                type="button"
              >
                <span className="text-xl">{t.icon}</span>
                <span className="leading-tight">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Time range */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            error={hasTimeError ? "Hora fin debe ser posterior a inicio" : undefined}
            label="Inicio"
            onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
            type="time"
            value={form.start_time}
          />
          <Input
            label="Fin"
            onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
            type="time"
            value={form.end_time}
          />
        </div>

        {/* Day selector */}
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Días de la semana</p>
          <div className="flex gap-2">
            {DAYS.map((day) => {
              const selected = form.days_of_week.includes(day.key);
              return (
                <button
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition",
                    selected ? "bg-primary text-white" : "bg-slate-100 text-muted hover:bg-primary/10 hover:text-primary",
                  )}
                  key={day.key}
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      days_of_week: selected
                        ? p.days_of_week.filter((d) => d !== day.key)
                        : [...p.days_of_week, day.key].sort(),
                    }))
                  }
                  type="button"
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Recurrence toggle */}
        <label className="flex cursor-pointer items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Obligación recurrente</p>
            <p className="text-xs text-muted">Se repite cada semana</p>
          </div>
          <div
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              form.is_recurring ? "bg-primary" : "bg-slate-300",
            )}
            onClick={() => setForm((p) => ({ ...p, is_recurring: !p.is_recurring }))}
          >
            <div
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                form.is_recurring ? "translate-x-5" : "translate-x-0.5",
              )}
            />
          </div>
        </label>

        {/* Conflict warning */}
        {conflicts.length > 0 && (
          <div className="rounded-xl border border-error/30 bg-red-50 p-3">
            <p className="text-sm font-semibold text-error">⚠️ Conflicto detectado</p>
            {conflicts.map((c, i) => (
              <p className="mt-1 text-xs text-error" key={i}>
                Se solapa con &ldquo;{c.name}&rdquo;
                {c.start_time && c.end_time
                  ? ` (${c.start_time.slice(0, 5)}-${c.end_time.slice(0, 5)})`
                  : ""}
              </p>
            ))}
          </div>
        )}

        <Button disabled={!canSave} isLoading={saving} onClick={addItem} type="button">
          Guardar Obligación
        </Button>
      </Card>

      {/* Existing obligations list */}
      {obligations.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold">Obligaciones añadidas</h2>
          {obligations.map((obl) => {
            const typeInfo = getTypeInfo(obl.type);
            return (
              <div
                className="flex items-center gap-3 rounded-xl border border-border bg-white p-3"
                key={obl.id}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl">
                  {typeInfo.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold">{obl.name}</p>
                  <p className="text-xs text-muted">
                    {String(obl.start_time).slice(0, 5)} - {String(obl.end_time).slice(0, 5)}
                    {" · "}
                    {(obl.days_of_week ?? [])
                      .map((d: number) => DAYS.find((day) => day.key === d)?.label)
                      .join(" ")}
                  </p>
                </div>
                <button
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted hover:bg-red-50 hover:text-error"
                  onClick={() => removeObligation(obl.id)}
                  type="button"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Button className="w-full" onClick={() => router.push("/onboarding/review")}>
        Continuar →
      </Button>
    </div>
  );
}
