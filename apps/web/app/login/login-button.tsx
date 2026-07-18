"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export function LoginButton() {
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    const supabase = createSupabaseBrowser();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <button
      type="button"
      onClick={signIn}
      disabled={pending}
      className="rounded border border-gray-800 px-6 py-2 font-medium hover:bg-gray-100 disabled:opacity-50"
    >
      {pending ? "Redirigiendo..." : "Entrar con Google"}
    </button>
  );
}
