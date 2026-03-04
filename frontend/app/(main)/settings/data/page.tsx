"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { userService } from "@/services/userService";

export default function SettingsDataPage() {
  const [password, setPassword] = useState("");
  const [exportResult, setExportResult] = useState<string>("");
  const [consent, setConsent] = useState({
    analytics_consent: false,
    marketing_consent: false,
    research_consent: false,
  });
  const [consentSaved, setConsentSaved] = useState(false);

  async function exportData() {
    const data = await userService.exportData();
    setExportResult(JSON.stringify(data, null, 2));
  }

  async function deleteAccount() {
    await userService.deleteAccount(password || undefined);
    window.location.href = "/";
  }

  async function saveConsent() {
    await userService.updateConsent(consent);
    setConsentSaved(true);
    setTimeout(() => setConsentSaved(false), 2000);
  }

  return (
    <div className="space-y-4">
      <Header subtitle="GDPR: exportar y eliminar tu información." title="Datos personales" />
      <Card className="grid gap-2">
        <p className="text-sm font-semibold">Consentimientos</p>
        <label className="flex items-center justify-between text-sm">
          <span>Analítica</span>
          <input
            checked={consent.analytics_consent}
            onChange={(event) =>
              setConsent((prev) => ({ ...prev, analytics_consent: event.target.checked }))
            }
            type="checkbox"
          />
        </label>
        <label className="flex items-center justify-between text-sm">
          <span>Marketing</span>
          <input
            checked={consent.marketing_consent}
            onChange={(event) =>
              setConsent((prev) => ({ ...prev, marketing_consent: event.target.checked }))
            }
            type="checkbox"
          />
        </label>
        <label className="flex items-center justify-between text-sm">
          <span>Investigación</span>
          <input
            checked={consent.research_consent}
            onChange={(event) =>
              setConsent((prev) => ({ ...prev, research_consent: event.target.checked }))
            }
            type="checkbox"
          />
        </label>
        <Button onClick={saveConsent} variant="outline">
          Guardar consentimientos
        </Button>
        {consentSaved ? (
          <p className="text-xs text-success">Consentimientos actualizados.</p>
        ) : null}
      </Card>
      <Card className="grid gap-2">
        <Button onClick={exportData} variant="outline">
          Exportar datos JSON
        </Button>
        {exportResult ? (
          <pre className="max-h-60 overflow-auto rounded-xl bg-slate-900 p-3 text-xs text-slate-100">
            {exportResult}
          </pre>
        ) : null}
      </Card>
      <Card className="grid gap-2 border-error/40">
        <p className="text-sm font-semibold text-error">Eliminar cuenta</p>
        <Input
          label="Contraseña actual (si aplica)"
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
        <Button onClick={deleteAccount} variant="danger">
          Eliminar cuenta y datos
        </Button>
      </Card>
    </div>
  );
}

