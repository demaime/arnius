import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "./env";

// Cliente con service role: saltea RLS. Solo vive en el scraper
// (local y GitHub Actions), jamás en la web.
export const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const RETENTION_ARTICLES_DAYS = 3;
const RETENTION_RUNS_DAYS = 30;

export interface ArticleRow {
  portal_id: number;
  url: string;
  title: string;
  summary: string | null;
  published_at: string | null;
}

export async function getEnabledPortals(): Promise<Map<string, number>> {
  const { data, error } = await db.from("portals").select("id, slug").eq("enabled", true);
  if (error) throw new Error(`portals: ${error.message}`);
  return new Map(data.map((p) => [p.slug as string, p.id as number]));
}

/**
 * Devuelve todas las URLs existentes en la base, paginadas.
 * Con la retención de 3 días son pocas miles de filas: es más robusto
 * traerlas y comparar en memoria que filtrar por URL en el query string
 * (URLs largas o con comas rompen el filtro `in`).
 */
export async function getExistingUrls(): Promise<Set<string>> {
  const existing = new Set<string>();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await db
      .from("articles")
      .select("url")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`articles(select url): ${error.message}`);
    for (const row of data) existing.add(row.url as string);
    if (data.length < pageSize) break;
  }
  return existing;
}

/** Inserta artículos ignorando URLs ya existentes (idempotente). */
export async function insertArticles(rows: ArticleRow[]): Promise<void> {
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await db
      .from("articles")
      .upsert(batch, { onConflict: "url", ignoreDuplicates: true });
    if (error) throw new Error(`articles(upsert): ${error.message}`);
  }
}

export async function createRun(): Promise<number> {
  const { data, error } = await db.from("scrape_runs").insert({}).select("id").single();
  if (error) throw new Error(`scrape_runs(insert): ${error.message}`);
  return data.id as number;
}

export async function finishRun(
  runId: number,
  status: "ok" | "partial" | "failed",
  articlesNew: number,
): Promise<void> {
  const { error } = await db
    .from("scrape_runs")
    .update({ status, articles_new: articlesNew, finished_at: new Date().toISOString() })
    .eq("id", runId);
  if (error) throw new Error(`scrape_runs(update): ${error.message}`);
}

export interface RunPortalRow {
  run_id: number;
  portal_id: number;
  articles_found: number;
  articles_new: number;
  error: string | null;
  duration_ms: number;
}

export async function recordRunPortals(rows: RunPortalRow[]): Promise<void> {
  const { error } = await db.from("scrape_run_portals").insert(rows);
  if (error) throw new Error(`scrape_run_portals(insert): ${error.message}`);
}

/** Borra artículos y corridas fuera de la ventana de retención. */
export async function applyRetention(now: Date): Promise<void> {
  const articleCutoff = new Date(
    now.getTime() - RETENTION_ARTICLES_DAYS * 86_400_000,
  ).toISOString();
  const runCutoff = new Date(now.getTime() - RETENTION_RUNS_DAYS * 86_400_000).toISOString();

  const oldPublished = await db.from("articles").delete().lt("published_at", articleCutoff);
  if (oldPublished.error) throw new Error(`retention(published): ${oldPublished.error.message}`);

  const oldUnpublished = await db
    .from("articles")
    .delete()
    .is("published_at", null)
    .lt("first_seen_at", articleCutoff);
  if (oldUnpublished.error)
    throw new Error(`retention(first_seen): ${oldUnpublished.error.message}`);

  const oldRuns = await db.from("scrape_runs").delete().lt("started_at", runCutoff);
  if (oldRuns.error) throw new Error(`retention(runs): ${oldRuns.error.message}`);

  const skippedCutoff = new Date(now.getTime() - RETENTION_SKIPPED_DAYS * 86_400_000).toISOString();
  const oldSkipped = await db.from("skipped_urls").delete().lt("skipped_at", skippedCutoff);
  if (oldSkipped.error) throw new Error(`retention(skipped): ${oldSkipped.error.message}`);
}

const RETENTION_SKIPPED_DAYS = 14;

/** URLs ya visitadas y descartadas por viejas: no volver a fetchearlas. */
export async function getSkippedUrls(): Promise<Set<string>> {
  const skipped = new Set<string>();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await db
      .from("skipped_urls")
      .select("url")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`skipped_urls(select): ${error.message}`);
    for (const row of data) skipped.add(row.url as string);
    if (data.length < pageSize) break;
  }
  return skipped;
}

export async function addSkippedUrls(urls: string[]): Promise<void> {
  for (let i = 0; i < urls.length; i += 500) {
    const batch = urls.slice(i, i + 500).map((url) => ({ url }));
    const { error } = await db
      .from("skipped_urls")
      .upsert(batch, { onConflict: "url", ignoreDuplicates: true });
    if (error) throw new Error(`skipped_urls(upsert): ${error.message}`);
  }
}

export interface PortalHealthRow {
  slug: string;
  name: string;
  bad_runs: number;
  last_run_at: string | null;
}

export async function getPortalHealth(): Promise<PortalHealthRow[]> {
  const { data, error } = await db
    .from("portal_health")
    .select("slug, name, bad_runs, last_run_at");
  if (error) throw new Error(`portal_health: ${error.message}`);
  return data as PortalHealthRow[];
}
