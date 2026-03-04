import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { MedicalDisclaimer } from "@/components/legal/MedicalDisclaimer";

export default function SettingsAboutPage() {
  return (
    <div className="space-y-4">
      <Header subtitle="Información legal y uso responsable." title="Acerca de" />
      <MedicalDisclaimer variant="inline" />
      <Card className="grid gap-2">
        <p className="text-sm font-semibold">Documentos legales</p>
        <Link className="text-sm text-primary underline" href="/privacy">
          Política de privacidad
        </Link>
        <Link className="text-sm text-primary underline" href="/terms">
          Términos del servicio
        </Link>
      </Card>
    </div>
  );
}
