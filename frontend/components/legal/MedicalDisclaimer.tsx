"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useUIStore } from "@/store/uiStore";

interface MedicalDisclaimerProps {
  variant: "modal" | "inline" | "footer";
  showOnFirstUse?: boolean;
  onAcknowledge?: () => void;
}

const STORAGE_KEY = "chronosync_medical_disclaimer_ack";

const points = [
  "ChronoSync ofrece información educativa sobre sueño y ritmo circadiano.",
  "No sustituye consejo médico profesional, diagnóstico ni tratamiento.",
  "Consulta a personal sanitario para trastornos del sueño o dudas de salud.",
  "El cuestionario MEQ es auto-reportado y no constituye evaluación clínica.",
];

export function MedicalDisclaimer({
  variant,
  showOnFirstUse = false,
  onAcknowledge,
}: MedicalDisclaimerProps) {
  const [isAcknowledged, setIsAcknowledged] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });
  const [accepted, setAccepted] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const setGlobalAccepted = useUIStore((state) => state.setDisclaimerAccepted);

  useEffect(() => {
    if (!showOnFirstUse) return;
    setGlobalAccepted(isAcknowledged);
  }, [isAcknowledged, setGlobalAccepted, showOnFirstUse]);

  const acknowledge = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsAcknowledged(true);
    setGlobalAccepted(true);
    onAcknowledge?.();
  };

  function handleScrollGate() {
    const element = contentRef.current;
    if (!element) return;
    const remaining = element.scrollHeight - element.scrollTop - element.clientHeight;
    if (remaining <= 4) setScrolledToBottom(true);
  }

  if (variant === "footer") {
    return (
      <p className="text-center text-xs text-muted">
        Esta app no reemplaza orientación médica profesional.{" "}
        <Link className="underline" href="/settings/about">
          Medical Disclaimer
        </Link>
      </p>
    );
  }

  if (variant === "inline") {
    return (
      <Card className="border-warning bg-amber-50">
        <p className="text-sm font-semibold">Información importante de salud</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
          {points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </Card>
    );
  }

  if (isAcknowledged) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <Card className="max-h-[85vh] w-full max-w-md">
        <h2 className="text-lg font-semibold">Información importante de salud</h2>
        <div
          className="mt-3 max-h-72 overflow-auto pr-1"
          onScroll={handleScrollGate}
          ref={contentRef}
        >
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            {points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Desplázate hasta el final para habilitar la confirmación.
          </p>
        </div>
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            checked={accepted}
            className="mt-1"
            onChange={(event) => setAccepted(event.target.checked)}
            type="checkbox"
          />
          <span>He leído y entiendo esta información.</span>
        </label>
        <Button
          className="mt-4 w-full"
          disabled={!accepted || !scrolledToBottom}
          onClick={acknowledge}
        >
          Entendido
        </Button>
      </Card>
    </div>
  );
}
