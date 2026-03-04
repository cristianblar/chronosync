"use client";
import { Suspense, useEffect, useState } from "react";

import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { authService } from "@/services/authService";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("Verificando correo...");

  useEffect(() => {
    if (!token) return;
    authService
      .verifyEmail(token)
      .then(() => setStatus("Correo verificado. Ya puedes iniciar sesión."))
      .catch(() => setStatus("No se pudo verificar. Enlace inválido o expirado."));
  }, [token]);

  return (
    <>
      <Header title="Verificación de correo" />
      <p className="text-sm text-muted">{token ? status : "Falta token de verificación."}</p>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="space-y-4">
      <Suspense fallback={<p className="text-sm text-muted">Verificando correo...</p>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}

