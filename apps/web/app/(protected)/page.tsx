import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { HomeShell } from "./home-shell";
import type { FeedArticle } from "./feed-list";
import type { Keyword } from "./keywords-modal";
import type { Theme } from "./theme-actions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [feedRes, keywordsRes, profileRes, lastRunRes] = await Promise.all([
    supabase.rpc("my_feed"),
    supabase.from("user_keywords").select("id, keyword").order("keyword"),
    supabase.from("profiles").select("display_name, theme").maybeSingle(),
    supabase
      .from("scrape_runs")
      .select("finished_at, status")
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const articles = (feedRes.data ?? []) as FeedArticle[];
  const keywords = (keywordsRes.data ?? []) as Keyword[];
  const profile = profileRes.data;

  const displayName =
    profile?.display_name ??
    (user.user_metadata.full_name as string | undefined) ??
    (user.email ?? "").split("@")[0];
  const avatarUrl =
    (user.user_metadata.avatar_url as string | undefined) ??
    (user.user_metadata.picture as string | undefined) ??
    null;

  return (
    <HomeShell
      articles={articles}
      keywords={keywords}
      displayName={displayName}
      email={user.email ?? null}
      avatarUrl={avatarUrl}
      dbTheme={(profile?.theme ?? "system") as Theme}
      lastRunIso={lastRunRes.data?.finished_at ?? null}
    />
  );
}
