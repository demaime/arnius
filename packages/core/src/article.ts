import { load } from "cheerio";
import type { CheerioAPI } from "cheerio";
import { parseIsoDate, parseSpanishDate } from "./dates";
import type { PortalConfig } from "./portals/types";
import type { ArticleData } from "./types";

/**
 * Extrae fecha de publicación, primer párrafo y firma de la página de una nota.
 * Cascada de fecha: ld+json → meta article:published_time → <time datetime> →
 * fallbacks de texto humano definidos por portal.
 * Cascada de autor: ld+json (solo Person) → meta author → fallbacks por portal.
 */
export function extractArticleData(
  html: string,
  config: PortalConfig,
  now: Date = new Date(),
): ArticleData {
  const $ = load(html);

  const publishedAt = extractDate($, config, now);
  const summary = extractSummary($, config);
  const author = extractAuthor($, config);

  return {
    publishedAt: publishedAt ? publishedAt.toISOString() : null,
    summary,
    author,
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

function extractAuthor($: CheerioAPI, config: PortalConfig): string | null {
  const fromLdJson = extractLdJsonAuthor($);
  if (fromLdJson) return fromLdJson;

  for (const selector of ["meta[name='author']", "meta[property='article:author']"]) {
    const author = sanitizeAuthor($(selector).attr("content"));
    if (author) return author;
  }

  for (const fallback of config.article.authorFallbacks ?? []) {
    const author = sanitizeAuthor(fallback($));
    if (author) return author;
  }

  return null;
}

function extractLdJsonAuthor($: CheerioAPI): string | null {
  let result: string | null = null;

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

    result = findAuthorInLdJson(data);
  });

  return result;
}

function findAuthorInLdJson(node: unknown): string | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findAuthorInLdJson(child);
      if (found) return found;
    }
    return null;
  }

  if (node && typeof node === "object") {
    const record = node as Record<string, unknown>;
    const names = personNames(record["author"]);
    if (names.length > 0) {
      const author = sanitizeAuthor(names.slice(0, 3).join(", "));
      if (author) return author;
    }
    if ("@graph" in record) return findAuthorInLdJson(record["@graph"]);
  }

  return null;
}

/**
 * Nombres de los autores de tipo Person. Se excluyen las Organization
 * (el medio como publisher, no una firma) y los strings sueltos (en los
 * portales reales son créditos de foto o vacíos). Clarín usa "type" sin @.
 */
function personNames(node: unknown): string[] {
  const entries = Array.isArray(node) ? node : [node];
  const names: string[] = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const type = record["@type"] ?? record["type"];
    const types = Array.isArray(type) ? type : [type];
    if (!types.includes("Person")) continue;
    if (typeof record["name"] === "string" && record["name"].trim()) {
      names.push(record["name"]);
    }
  }

  return names;
}

/** Limpia una firma candidata; null si es basura (URL, email, dominio, vacío). */
function sanitizeAuthor(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const text = raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^por\s+/i, "");
  if (text.length < 3) return null;
  if (/https?:\/\//i.test(text) || text.includes("@")) return null;
  // Dominios como firma ("derechadiario.com.ar" en meta author).
  if (!text.includes(" ") && /^\S+\.[a-z]{2,}$/i.test(text)) return null;

  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}
