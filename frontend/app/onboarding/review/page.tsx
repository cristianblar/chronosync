"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CHRONOTYPE_META } from "@/constants/chronotype-categories";
import { useOnboardingStore } from "@/store/onboardingStore";
import { useAuthStore } from "@/store/authStore";
import { planService } from "@/services/planService";
import { chronotypeService } from "@/services/chronotypeService";
import { useUIStore } from "@/store/uiStore";

const CHRONOTYPE_ICONS: Record<string, string> = {
  extreme_morning: "🌅",
  moderate_morning: "🌤",
  intermediate: "🌞",
  moderate_evening: "🌆",
  extreme_evening: "🌙",
};

export default function OnboardingReviewPage() {
  const router = useRouter();
  const result = useOnboardingStore((state) => state.result);
  const obligations = useOnboardingStore((state) => state.obligations);
  const responses = useOnboardingStore((state) => state.meqResponses);
  const isAssessmentSubmitted = useOnboardingStore((state) => state.isAssessmentSubmitted);
  const markAssessmentSubmitted = useOnboardingStore((state) => state.markAssessmentSubmitted);
  const isMEQComplete = useOnboardingStore((state) => state.isMEQComplete);
  const reset = useOnboardingStore((state) => state.reset);
  const setOnboardingComplete = useAuthStore((state) => state.setOnboardingComplete);
  const pushToast = useUIStore((state) => state.pushToast);
  const [loading, setLoading] = useState(false);

  const meta = result ? CHRONOTYPE_META[result.chronotype] : null;
  const icon = result ? (CHRONOTYPE_ICONS[result.chronotype] ?? "🌙") : "🌙";

  async function finish() {
    if (!isMEQComplete()) {
      pushToast({ type: "error", message: "Debes completar las 19 preguntas del MEQ." });
      router.push("/onboarding/meq");
      return;
    }
    setLoading(true);
    try {
      if (!isAssessmentSubmitted) {
        await chronotypeService.submitAssessment(responses);
        markAssessmentSubmitted(true);
      }
      await planService.generate({ start_date: new Date().toISOString().slice(0, 10) });
      setOnboardingComplete();
      reset();
      router.push("/dashboard");
    } catch (error) {
      pushToast({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo completar el proceso. Inténtalo de nuevo.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mobile-container space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">¡Casi listo!</h1>
        <p className="mt-1 text-sm text-muted">Revisa tu perfil y genera tu plan personalizado.</p>
      </div>

      {/* Chronotype summary */}
      {result && meta ? (
        <div className="rounded-2xl gradient-hero p-6 text-white">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{icon}</span>
            <div>
              <p className="text-sm opacity-80">Tu cronotipo</p>
              <p className="text-xl font-bold">{meta.label}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/20 p-3 text-center">
              <p className="text-[10px] opacity-70">Despertar ideal</p>
              <p className="text-sm font-semibold">{result.idealWakeTime}</p>
            </div>
            <div className="rounded-xl bg-white/20 p-3 text-center">
              <p className="text-[10px] opacity-70">Dormir ideal</p>
              <p className="text-sm font-semibold">{result.idealSleepTime}</p>
            </div>
          </div>
        </div>
      ) : (
        <Card className="border-warning/40 bg-amber-50">
          <p className="text-sm font-semibold text-warning">⚠️ MEQ incompleto</p>
          <p className="text-xs text-muted mt-1">Necesitas completar las 19 preguntas.</p>
          <Button className="mt-3" onClick={() => router.push("/onboarding/meq")} size="sm" variant="outline">
            Completar MEQ
          </Button>
        </Card>
      )}

      {/* Obligations summary */}
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Obligaciones</h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {obligations.length}
          </span>
        </div>
        {obligations.length === 0 ? (
          <p className="mt-2 text-xs text-muted">Sin obligaciones (el plan será más flexible).</p>
        ) : (
          <div className="mt-2 space-y-1">
            {obligations.slice(0, 3).map((obl) => (
              <div className="flex items-center justify-between text-xs" key={obl.id}>
                <span className="text-foreground">{obl.name}</span>
                <span className="text-muted">{String(obl.start_time).slice(0, 5)} - {String(obl.end_time).slice(0, 5)}</span>
              </div>
            ))}
            {obligations.length > 3 && (
              <p className="text-xs text-muted">+{obligations.length - 3} más</p>
            )}
          </div>
        )}
      </Card>

      {/* Plan generation */}
      <Card className="border-primary/20 bg-primary/5">
        <h2 className="font-semibold text-primary">¿Qué se generará?</h2>
        <ul className="mt-2 space-y-1">
          {[
            "Plan de sueño de 7 días personalizado",
            "Horarios de cafeína, luz y ejercicio",
            "Plan de transición gradual si es necesario",
            "Notificaciones personalizadas",
          ].map((item) => (
            <li className="flex items-start gap-2 text-xs text-muted" key={item}>
              <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path clipRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fillRule="evenodd" />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </Card>

      <Button className="w-full" isLoading={loading} onClick={finish}>
        Generar mi plan →
      </Button>
    </div>
  );
}
