"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";

export interface KeywordActionState {
  error: string | null;
}

export async function addKeyword(
  _prev: KeywordActionState,
  formData: FormData,
): Promise<KeywordActionState> {
  const keyword = String(formData.get("keyword") ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (keyword.length < 2 || keyword.length > 80) {
    return { error: "La palabra debe tener entre 2 y 80 caracteres." };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("user_keywords")
    .insert({ user_id: user.id, keyword: keyword.toLowerCase() });

  if (error) {
    // 23505 = clave duplicada (misma palabra con/sin tildes o mayúsculas)
    if (error.code === "23505") {
      return { error: `"${keyword}" ya está en tu lista.` };
    }
    return { error: "No se pudo agregar la palabra. Probá de nuevo." };
  }

  // Refresca todo el árbol: el feed y la lista del modal se actualizan juntos.
  revalidatePath("/", "layout");
  return { error: null };
}

export async function removeKeyword(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("user_keywords").delete().eq("id", id);

  revalidatePath("/", "layout");
}
