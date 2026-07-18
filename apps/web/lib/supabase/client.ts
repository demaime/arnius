import { createBrowserClient } from "@supabase/ssr";

/** Cliente Supabase para el browser. Solo se usa para el flujo de login. */
export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  );
}
