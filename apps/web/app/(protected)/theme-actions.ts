"use server";

import { cookies } from "next/headers";
import { createSupabaseServer } from "@/lib/supabase/server";

export type Theme = "light" | "dark" | "system";

const THEMES: Theme[] = ["light", "dark", "system"];

export async function setTheme(theme: Theme): Promise<void> {
  if (!THEMES.includes(theme)) return;

  const cookieStore = await cookies();
  cookieStore.set("arnius-theme", theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("profiles").update({ theme }).eq("id", user.id);
  }
}
