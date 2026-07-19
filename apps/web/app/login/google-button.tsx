"use client";

import { useRouter } from "next/navigation";
import Script from "next/script";
import { useCallback, useRef, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    nonce?: string;
    use_fedcm_for_prompt?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

/** Nonce aleatorio: el hash va a Google, el original a Supabase, que los compara. */
function randomNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Botón oficial "Acceder con Google" (Google Identity Services).
 * El consentimiento ocurre en NUESTRO dominio: no aparece el dominio
 * técnico de Supabase en la pantalla de Google.
 */
export function GoogleButton() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const nonceRef = useRef<string>(randomNonce());
  const [error, setError] = useState<string | null>(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const initialize = useCallback(async () => {
    if (!window.google || !containerRef.current || !clientId) return;

    const hashedNonce = await sha256Hex(nonceRef.current);

    window.google.accounts.id.initialize({
      client_id: clientId,
      nonce: hashedNonce,
      callback: async (response) => {
        const supabase = createSupabaseBrowser();
        const { error: signInError } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: response.credential,
          nonce: nonceRef.current,
        });
        if (signInError) {
          setError("No se pudo iniciar sesión. Probá de nuevo.");
          return;
        }
        router.replace("/");
        router.refresh();
      },
    });

    window.google.accounts.id.renderButton(containerRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "signin_with",
      locale: "es",
    });
  }, [clientId, router]);

  if (!clientId) {
    return <p role="alert">Falta configurar NEXT_PUBLIC_GOOGLE_CLIENT_ID.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Script
        src="https://accounts.google.com/gsi/client"
        onReady={() => {
          void initialize();
        }}
      />
      <div ref={containerRef} />
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
