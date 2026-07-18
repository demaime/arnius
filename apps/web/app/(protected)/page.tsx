import { createSupabaseServer } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/format";
import { FeedList, type FeedArticle } from "./feed-list";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createSupabaseServer();

  const [feedRes, keywordsRes, lastRunRes] = await Promise.all([
    supabase.rpc("my_feed"),
    supabase.from("user_keywords").select("keyword"),
    supabase
      .from("scrape_runs")
      .select("finished_at, status")
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const articles = (feedRes.data ?? []) as FeedArticle[];
  const keywords = (keywordsRes.data ?? []).map((k) => k.keyword as string);
  const lastRun = lastRunRes.data;

  return (
    <main className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Noticias</h1>
        {lastRun?.finished_at ? (
          <p className="text-xs text-gray-500">Actualizado {formatRelative(lastRun.finished_at)}</p>
        ) : null}
      </div>

      {keywords.length === 0 ? (
        <p className="text-gray-600">
          No tenés palabras en tu lista. Agregá la primera desde el botón «Mis palabras» (arriba)
          para armar tu feed.
        </p>
      ) : articles.length === 0 ? (
        <p className="text-gray-600">
          No hay noticias de los últimos 3 días que matcheen tus palabras ({keywords.join(", ")}).
          Ajustá tu lista desde el botón «Mis palabras» (arriba).
        </p>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            {articles.length} noticias de los últimos 3 días para tus {keywords.length} palabras.
          </p>
          <FeedList articles={articles} keywords={keywords} />
        </>
      )}
    </main>
  );
}
