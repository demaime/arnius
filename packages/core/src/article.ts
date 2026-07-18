import { load } from "cheerio";
import type { CheerioAPI } from "cheerio";
import { parseIsoDate, parseSpanishDate } from "./dates";
import type { PortalConfig } from "./portals/types";
import type { ArticleData } from "./types";

/**
 * Extrae fecha de publicación y primer párrafo de la página de una nota.
 * Cascada de fecha: ld+json → meta article:published_time → <time datetime> →
 * fallbacks de texto humano definidos por portal.
 */
export function extractArticleData(
  html: string,
  config: PortalConfig,
  now: Date = new Date(),
): ArticleData {
  const $ = load(html);

  const publishedAt = extractDate($, config, now);
  const summary = extractSummary($, config);

  return {
    publishedAt: publishedAt ? publishedAt.toISOString() : null,
    summary,
  };
}

function extractDate($: CheerioAPI, config: PortalConfig, now: Date): Date | null {
  const fromLdJson = extractLdJsonDate($);
  if (fromLdJson) return fromLdJson;

  for (const property of ["article:published_time", "article:modified_time"]) {
    const content = $(`meta[property='${property}']`).attr("content");
    const date = parseIsoDate(content);
    if (date) return date;
  }

  const timeAttr = $("time[datetime]").first().attr("datetime");
  const fromTime = parseIsoDate(timeAttr) ?? parseSpanishDate(timeAttr, now);
  if (fromTime) return fromTime;

  for (const fallback of config.article.dateFallbacks ?? []) {
    const raw = fallback($);
    const date = parseSpanishDate(raw, now) ?? parseIsoDate(raw);
    if (date) return date;
  }

  return null;
}

function extractLdJsonDate($: CheerioAPI): Date | null {
  let result: Date | null = null;

  $("script[type='application/ld+json']").each((_, element) => {
    if (result) return;
    const raw = $(element).text();
    if (!raw) return;

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }

    result = findDateInLdJson(data);
  });

  return result;
}

function findDateInLdJson(node: unknown): Date | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findDateInLdJson(child);
      if (found) return found;
    }
    return null;
  }

  if (node && typeof node === "object") {
    const record = node as Record<string, unknown>;
    for (const key of ["datePublished", "dateModified"]) {
      const value = record[key];
      if (typeof value === "string") {
        const date = parseIsoDate(value);
        if (date) return date;
      }
    }
    if ("@graph" in record) return findDateInLdJson(record["@graph"]);
  }

  return null;
}

function extractSummary($: CheerioAPI, config: PortalConfig): string | null {
  const candidates = [config.article.summarySelector, "article p", "main p"];

  for (const selector of candidates) {
    const elements = $(selector);
    for (const element of elements.toArray()) {
      const text = $(element).text().replace(/\s+/g, " ").trim();
      // Descartar párrafos triviales (créditos, "Seguí leyendo", etc.).
      if (text.length >= 60) return clip(text);
    }
  }

  // Último recurso: la descripción SEO (cubre portales con cuerpo renderizado por JS).
  for (const selector of ["meta[property='og:description']", "meta[name='description']"]) {
    const content = $(selector).attr("content")?.replace(/\s+/g, " ").trim();
    if (content && content.length >= 60) return clip(content);
  }

  return null;
}

function clip(text: string): string {
  return text.length > 500 ? `${text.slice(0, 497)}...` : text;
}
