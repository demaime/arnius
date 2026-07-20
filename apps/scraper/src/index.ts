import {
  extractArticleData,
  extractFrontPageItems,
  PORTALS,
  type FrontPageItem,
  type PortalConfig,
} from "@arnius/core";
import {
  addSkippedUrls,
  applyRetention,
  createRun,
  finishRun,
  getEnabledPortals,
  getExistingUrls,
  getSkippedUrls,
  insertArticles,
  recordRunPortals,
  type ArticleRow,
} from "./db";
import { fetchPage } from "./fetchPage";
import { checkHealthOrExit } from "./health";
import { mapWithConcurrency } from "./pool";

const RETENTION_DAYS = 3;
const FRONT_PAGE_CONCURRENCY = 4;
const ENRICH_CONCURRENCY = 6;

interface PortalResult {
  portal: PortalConfig;
  found: number;
  error: string | null;
  durationMs: number;
  items: FrontPageItem[];
}

async function scrapeFrontPages(portals: PortalConfig[]): Promise<PortalResult[]> {
  return mapWithConcurrency(portals, FRONT_PAGE_CONCURRENCY, async (portal) => {
    const start = Date.now();
    try {
      const html = await fetchPage(portal.baseUrl, portal.encoding);
      const items = extractFrontPageItems(html, portal);
      console.log(`  ${portal.slug}: ${items.length} notas en portada`);
      return {
        portal,
        found: items.length,
        error: items.length === 0 ? "0 notas extraídas de la portada" : null,
        durationMs: Date.now() - start,
        items,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ${portal.slug}: ERROR ${message}`);
      return { portal, found: 0, error: message, durationMs: Date.now() - start, items: [] };
    }
  });
}

async function enrichNewItems(
  items: FrontPageItem[],
  portalsBySlug: Map<string, PortalConfig>,
  portalIds: Map<string, number>,
  now: Date,
): Promise<{ rows: ArticleRow[]; tooOldUrls: string[] }> {
  const cutoff = now.getTime() - RETENTION_DAYS * 86_400_000;
  const rows: ArticleRow[] = [];
  const tooOldUrls: string[] = [];
  let processed = 0;

  await mapWithConcurrency(items, ENRICH_CONCURRENCY, async (item) => {
    const portal = portalsBySlug.get(item.portalSlug);
    if (!portal) return;

    let summary: string | null = null;
    let author: string | null = null;
    let publishedAt: string | null = null;
    try {
      const html = await fetchPage(item.url, portal.encoding);
      const data = extractArticleData(html, portal, now);
      summary = data.summary;
      author = data.author;
      publishedAt = data.publishedAt;
    } catch {
      // La nota se guarda igual sin enriquecer: el feed usa first_seen_at.
    }

    processed += 1;
    if (processed % 25 === 0 || processed === items.length) {
      console.log(`  enriquecidas ${processed}/${items.length}`);
    }

    // Notas con fecha anterior a la ventana de retención no entran
    // (las portadas suelen tener notas viejas fijadas). Se recuerdan
    // en skipped_urls para no volver a visitarlas en cada corrida.
    if (publishedAt && new Date(publishedAt).getTime() < cutoff) {
      tooOldUrls.push(item.url);
      return;
    }

    rows.push({
      portal_id: portalIds.get(item.portalSlug) as number,
      url: item.url,
      title: item.title,
      summary,
      author,
      published_at: publishedAt,
    });
  });

  return { rows, tooOldUrls };
}

async function main(): Promise<void> {
  const now = new Date();

  const portalIds = await getEnabledPortals();
  const activePortals = PORTALS.filter((p) => portalIds.has(p.slug));
  const portalsBySlug = new Map(activePortals.map((p) => [p.slug, p]));

  for (const portal of PORTALS) {
    if (!portalIds.has(portal.slug)) {
      console.warn(`Aviso: ${portal.slug} no está habilitado en la base — se saltea`);
    }
  }

  const runId = await createRun();
  console.log(`Corrida #${runId} — ${activePortals.length} portales`);

  try {
    console.log("Portadas:");
    const results = await scrapeFrontPages(activePortals);

    const allItems = results.flatMap((r) => r.items);
    const [existing, skipped] = await Promise.all([getExistingUrls(), getSkippedUrls()]);
    const newItems = allItems.filter((i) => !existing.has(i.url) && !skipped.has(i.url));
    console.log(`${allItems.length} notas en portadas, ${newItems.length} nuevas por enriquecer`);

    const { rows, tooOldUrls } = await enrichNewItems(newItems, portalsBySlug, portalIds, now);
    await insertArticles(rows);
    if (tooOldUrls.length > 0) {
      await addSkippedUrls(tooOldUrls);
      console.log(`${tooOldUrls.length} notas viejas recordadas en skipped_urls`);
    }
    console.log(`${rows.length} notas nuevas insertadas`);

    const slugById = new Map([...portalIds.entries()].map(([slug, id]) => [id, slug]));
    const newByPortal = new Map<string, number>();
    for (const row of rows) {
      const slug = slugById.get(row.portal_id);
      if (slug) newByPortal.set(slug, (newByPortal.get(slug) ?? 0) + 1);
    }

    await recordRunPortals(
      results.map((r) => ({
        run_id: runId,
        portal_id: portalIds.get(r.portal.slug) as number,
        articles_found: r.found,
        articles_new: newByPortal.get(r.portal.slug) ?? 0,
        error: r.error,
        duration_ms: r.durationMs,
      })),
    );

    await applyRetention(now);

    const failures = results.filter((r) => r.error !== null).length;
    const status = failures === 0 ? "ok" : failures === results.length ? "failed" : "partial";
    await finishRun(runId, status, rows.length);
    console.log(`Corrida #${runId} terminada: ${status}`);
  } catch (err) {
    await finishRun(runId, "failed", 0).catch(() => {});
    throw err;
  }

  await checkHealthOrExit();
}

main().catch((err) => {
  console.error("Corrida fallida:", err);
  process.exit(1);
});
