"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MEQ_QUESTIONS } from "@/constants/meq-questions";
import type { MEQQuestion } from "@/constants/meq-questions";
import { useOnboardingStore } from "@/store/onboardingStore";
import { CHRONOTYPE_META } from "@/constants/chronotype-categories";
import type { ChronotypeResult } from "@/lib/meq-scoring";

const CHRONOTYPE_ICONS: Record<string, string> = {
  extreme_morning: "🌅",
  moderate_morning: "🌤",
  intermediate: "🌞",
  moderate_evening: "🌆",
  extreme_evening: "🌙",
};

const CHRONOTYPE_DESCRIPTIONS: Record<string, string> = {
  extreme_morning: "Te despiertas naturalmente antes de las 7:00 y alcanzas tu máximo rendimiento por la mañana. Tus noches son cortas por naturaleza.",
  moderate_morning: "Prefieres las mañanas y rindes mejor en la primera mitad del día. Te adaptas con facilidad a horarios matutinos.",
  intermediate: "Tienes buena flexibilidad para adaptarte a diferentes horarios. Tu rendimiento es óptimo de media mañana a primera tarde.",
  moderate_evening: "Necesitas tiempo para activarte por las mañanas y alcanzas tu mejor rendimiento en la tarde-noche.",
  extreme_evening: "Tu reloj biológico está claramente orientado a las noches. Tu pico de rendimiento cognitivo ocurre en las últimas horas del día.",
};

const PEAK_PERFORMANCE: Record<string, string> = {
  extreme_morning: "08:00 - 11:00",
  moderate_morning: "09:00 - 12:00",
  intermediate: "10:00 - 14:00",
  moderate_evening: "14:00 - 19:00",
  extreme_evening: "17:00 - 22:00",
};

// ─── Question type components ─────────────────────────────────────────────────

function MultipleChoiceQuestion({
  question,
  onAnswer,
}: {
  question: MEQQuestion;
  onAnswer: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      {question.options.map((opt) => (
        <button
          className="flex w-full items-center justify-between rounded-xl border border-border bg-white px-4 py-3 text-left text-sm transition hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
          key={opt.value}
          onClick={() => onAnswer(opt.value)}
          type="button"
        >
          <span className="font-medium">{opt.label}</span>
          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {opt.value} pt{opt.value !== 1 ? "s" : ""}
          </span>
        </button>
      ))}
    </div>
  );
}

function LikertScaleQuestion({
  question,
  onAnswer,
}: {
  question: MEQQuestion;
  onAnswer: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      {/* Labels row */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${question.options.length}, 1fr)` }}>
        {question.options.map((opt) => (
          <span className="text-center text-[10px] text-muted leading-tight" key={opt.value}>
            {opt.label}
          </span>
        ))}
      </div>
      {/* Buttons row */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${question.options.length}, 1fr)` }}>
        {question.options.map((opt, idx) => (
          <button
            className="flex h-12 items-center justify-center rounded-xl border border-border bg-white text-sm font-semibold transition hover:border-primary hover:bg-primary/10 hover:text-primary active:scale-[0.96]"
            key={opt.value}
            onClick={() => onAnswer(opt.value)}
            type="button"
          >
            {idx + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

function TimeRangeQuestion({
  question,
  onAnswer,
}: {
  question: MEQQuestion;
  onAnswer: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      {question.options.map((opt) => (
        <button
          className="flex w-full items-center justify-between rounded-xl border border-border bg-white px-4 py-3 text-left transition hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
          key={opt.value}
          onClick={() => onAnswer(opt.value)}
          type="button"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-sm font-medium">{opt.label}</span>
          </div>
          <svg className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ))}
    </div>
  );
}

// ─── Results screen ───────────────────────────────────────────────────────────

function ResultsScreen({ result, onContinue }: { result: ChronotypeResult; onContinue: () => void }) {
  const meta = CHRONOTYPE_META[result.chronotype];
  const icon = CHRONOTYPE_ICONS[result.chronotype] ?? "🌙";
  const description = CHRONOTYPE_DESCRIPTIONS[result.chronotype] ?? "";
  const peak = PEAK_PERFORMANCE[result.chronotype] ?? "";

  return (
    <div className="animate-fade-in space-y-6">
      {/* Hero */}
      <div className="rounded-2xl gradient-hero p-6 text-center text-white">
        <div className="mx-auto mb-3 text-4xl">{icon}</div>
        <p className="text-sm font-medium opacity-90">Tu cronotipo</p>
        <h2 className="mt-1 text-2xl font-bold">{meta.label}</h2>
        <div className="mt-3 inline-block rounded-full bg-white/20 px-4 py-1 text-sm font-semibold">
          Puntuación MEQ: {result.score}/86
        </div>
      </div>

      {/* Description */}
      <Card>
        <h3 className="mb-2 font-semibold">Tu perfil circadiano</h3>
        <p className="text-sm text-muted leading-relaxed">{description}</p>
      </Card>

      {/* Ideal times */}
      <Card>
        <h3 className="mb-3 font-semibold">Horarios ideales estimados</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-primary/5 p-3 text-center">
            <p className="text-xs text-muted">Despertar</p>
            <p className="text-lg font-bold text-primary">{result.idealWakeTime}</p>
          </div>
          <div className="rounded-xl bg-secondary/5 p-3 text-center">
            <p className="text-xs text-muted">Dormir</p>
            <p className="text-lg font-bold text-secondary">{result.idealSleepTime}</p>
          </div>
          <div className="rounded-xl bg-success/5 p-3 text-center col-span-2">
            <p className="text-xs text-muted">Pico de rendimiento</p>
            <p className="text-sm font-bold text-success">{peak}</p>
          </div>
        </div>
      </Card>

      {/* Info */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-xs text-muted">
          Basado en el Cuestionario de Matutinidad-Vespertinidad (Horne & Östberg, 1976), validado en más de 500.000 personas. Los horarios se afinarán con tus datos de seguimiento.
        </p>
      </div>

      <Button className="w-full" onClick={onContinue}>
        Configurar Obligaciones →
      </Button>
    </div>
  );
}

// ─── MEQ intro screen ─────────────────────────────────────────────────────────

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="rounded-2xl gradient-hero p-6 text-center text-white">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold">Descubre tu Cronotipo</h1>
        <p className="mt-2 text-sm opacity-90">Cuestionario MEQ validado científicamente</p>
      </div>

      <Card>
        <h3 className="mb-3 font-semibold">Sobre esta evaluación</h3>
        <p className="text-sm text-muted leading-relaxed">
          El Morningness-Eveningness Questionnaire (MEQ) fue desarrollado por Horne y Östberg en 1976 y es el instrumento más utilizado para evaluar el cronotipo humano, con más de 40 años de validación científica.
        </p>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-primary/5 p-3 text-center">
          <p className="text-2xl font-bold text-primary">19</p>
          <p className="text-xs text-muted mt-0.5">preguntas</p>
        </div>
        <div className="rounded-xl bg-secondary/5 p-3 text-center">
          <p className="text-2xl font-bold text-secondary">5-8</p>
          <p className="text-xs text-muted mt-0.5">minutos</p>
        </div>
        <div className="rounded-xl bg-success/5 p-3 text-center">
          <p className="text-2xl font-bold text-success">5</p>
          <p className="text-xs text-muted mt-0.5">cronotipos</p>
        </div>
      </div>

      <Card>
        <h3 className="mb-2 font-semibold text-sm">Recomendaciones</h3>
        <ul className="space-y-1">
          {[
            "Responde según tus preferencias naturales",
            "No hay respuestas correctas o incorrectas",
            "Piensa en tu rutina ideal, sin obligaciones externas",
          ].map((tip) => (
            <li className="flex items-start gap-2 text-sm text-muted" key={tip}>
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path clipRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fillRule="evenodd" />
              </svg>
              {tip}
            </li>
          ))}
        </ul>
      </Card>

      <Button className="w-full" onClick={onStart}>
        Comenzar Evaluación →
      </Button>
    </div>
  );
}

// ─── Main MEQ Page ────────────────────────────────────────────────────────────

export default function MEQPage() {
  const router = useRouter();
  const responses = useOnboardingStore((state) => state.meqResponses);
  const setResponse = useOnboardingStore((state) => state.setResponse);
  const undoLastResponse = useOnboardingStore((state) => state.undoLastResponse);
  const computeResult = useOnboardingStore((state) => state.computeResult);
  const meqResult = useOnboardingStore((state) => state.meqResult);

  const [showIntro, setShowIntro] = useState(true);

  const answered = Object.keys(responses).length;
  const currentQuestion = MEQ_QUESTIONS[answered] ?? null;
  const isComplete = answered >= MEQ_QUESTIONS.length;

  function handleAnswer(value: number) {
    if (!currentQuestion) return;
    setResponse(currentQuestion.id, value);
  }

  function handleBack() {
    if (answered > 0) {
      undoLastResponse();
    } else {
      setShowIntro(true);
    }
  }

  function handleContinue() {
    computeResult();
    router.push("/onboarding/obligations");
  }

  if (showIntro && answered === 0) {
    return (
      <div className="mobile-container">
        <IntroScreen onStart={() => setShowIntro(false)} />
      </div>
    );
  }

  if (isComplete && meqResult) {
    return (
      <div className="mobile-container">
        <ResultsScreen result={meqResult} onContinue={handleContinue} />
      </div>
    );
  }

  if (isComplete && !meqResult) {
    computeResult();
  }

  return (
    <div className="mobile-container">
      <div className="space-y-4 animate-fade-in">
        {/* Progress header */}
        <div className="flex items-center justify-between">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-muted hover:bg-primary/5 hover:text-primary"
            onClick={handleBack}
            type="button"
          >
            ←
          </button>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">EVALUACIÓN MEQ</p>
          </div>
          <span className="text-sm font-medium text-muted">{answered + 1} de {MEQ_QUESTIONS.length}</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
            style={{ width: `${((answered) / MEQ_QUESTIONS.length) * 100}%` }}
          />
        </div>

        {/* Question */}
        {currentQuestion && (
          <Card className="space-y-4">
            <p className="font-semibold leading-snug">{currentQuestion.text}</p>

            {currentQuestion.type === "time-range" && (
              <TimeRangeQuestion question={currentQuestion} onAnswer={handleAnswer} />
            )}
            {currentQuestion.type === "multiple-choice" && (
              <MultipleChoiceQuestion question={currentQuestion} onAnswer={handleAnswer} />
            )}
            {currentQuestion.type === "likert" && (
              <LikertScaleQuestion question={currentQuestion} onAnswer={handleAnswer} />
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
