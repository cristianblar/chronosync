"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authService } from "@/services/authService";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setMessage("Si existe la cuenta, recibirás un correo de recuperación.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Header subtitle="Te enviaremos un enlace para recuperar acceso." title="Recuperar contraseña" />
      <form className="grid gap-3" onSubmit={onSubmit}>
        <Input label="Email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
        <Button isLoading={loading} type="submit">
          Enviar enlace
        </Button>
      </form>
      {message ? <p className="text-sm text-success">{message}</p> : null}
    </div>
  );
}

