import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { MedicalDisclaimer } from "@/components/legal/MedicalDisclaimer";

const STEPS = [
  { n: "1", icon: "🧬", title: "Evaluación MEQ", desc: "19 preguntas para determinar tu cronotipo biológico (5-8 min)" },
  { n: "2", icon: "📅", title: "Tus obligaciones", desc: "Añade tus compromisos recurrentes para que el plan los respete" },
  { n: "3", icon: "✨", title: "Tu plan personalizado", desc: "Recibirás un plan de 7 días optimizado con OR-Tools" },
];

export default function WelcomePage() {
  return (
    <div className="mobile-container space-y-8 animate-fade-in">
      {/* Hero */}
      <div className="text-center pt-4">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-secondary shadow-lg">
          <span className="text-4xl">🌙</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Bienvenido a ChronoSync</h1>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Vamos a personalizar tu plan de sueño en 3 pasos simples. Solo necesitas 10-15 minutos.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {STEPS.map((step) => (
          <div className="flex items-start gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm" key={step.n}>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl">
              {step.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  Paso {step.n}
                </span>
                <p className="text-sm font-semibold">{step.title}</p>
              </div>
              <p className="mt-0.5 text-xs text-muted">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <MedicalDisclaimer variant="inline" />

      <Link href="/onboarding/meq">
        <Button className="w-full">
          Comenzar →
        </Button>
      </Link>
    </div>
  );
}
