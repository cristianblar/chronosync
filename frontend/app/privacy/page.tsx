import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";

export default function PrivacyPage() {
  return (
    <main className="mobile-container space-y-4">
      <Header title="Política de privacidad" />
      <Card className="space-y-2 text-sm text-slate-700">
        <p>Recogemos solo los datos necesarios para personalizar tu plan de sueño.</p>
        <p>Puedes exportar o eliminar tus datos desde Ajustes &gt; Datos.</p>
        <p>No compartimos información médica con terceros sin consentimiento explícito.</p>
      </Card>
    </main>
  );
}

