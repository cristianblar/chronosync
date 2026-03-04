import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";

export default function TermsPage() {
  return (
    <main className="mobile-container space-y-4">
      <Header title="Términos del servicio" />
      <Card className="space-y-2 text-sm text-slate-700">
        <p>ChronoSync es una herramienta educativa de hábitos circadianos.</p>
        <p>No constituye diagnóstico ni tratamiento médico.</p>
        <p>El uso continuado implica aceptación de estos términos.</p>
      </Card>
    </main>
  );
}
