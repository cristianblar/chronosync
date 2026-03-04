"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleScript } from "@/lib/google";

interface GoogleAuthButtonProps {
  onCredential: (idToken: string) => Promise<void>;
  text?: "signin_with" | "signup_with" | "continue_with";
}

export function GoogleAuthButton({
  onCredential,
  text = "continue_with",
}: GoogleAuthButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(
    clientId ? null : "Define NEXT_PUBLIC_GOOGLE_CLIENT_ID para activar Google OAuth.",
  );

  useEffect(() => {
    if (!clientId) return;
    let mounted = true;
    loadGoogleScript()
      .then(() => {
        if (!mounted || !window.google || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: { credential?: string }) => {
            if (!response.credential) return;
            try {
              await onCredential(response.credential);
            } catch {
              setError("No se pudo autenticar con Google.");
            }
          },
        });
        containerRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          type: "standard",
          shape: "pill",
          text,
          width: "280",
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Google OAuth no disponible.");
      });
    return () => {
      mounted = false;
    };
  }, [clientId, onCredential, text]);

  return (
    <div className="grid gap-2">
      <div className="min-h-11" ref={containerRef} />
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
}
