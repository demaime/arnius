import { load } from "cheerio";
import type { PortalConfig } from "./portals/types";
import type { FrontPageItem } from "./types";
import { normalizeUrl } from "./url";

/**
 * Extrae los ítems (título + URL) de la portada de un portal ya decodificada.
 * Deduplica por URL y por título dentro de la misma portada.
 */
export function extractFrontPageItems(html: string, config: PortalConfig): FrontPageItem[] {
  const $ = load(html);
  const items: FrontPageItem[] = [];
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();

  $(config.frontPage.itemSelector).each((_, element) => {
    const el = $(element);

    const title = (
      config.frontPage.titleSelector
        ? el.find(config.frontPage.titleSelector).first().text()
        : el.text()
    )
      .replace(/\s+/g, " ")
      .trim();

    const href =
      config.frontPage.hrefFrom === "self" ? el.attr("href") : el.find("a").first().attr("href");

    const url = normalizeUrl(href, config.baseUrl);
    if (!url || !title || title.length < 4) return;

    // La home misma o secciones no son notas.
    const path = new URL(url).pathname;
    if (path === "/" || path.length < 2) return;

    if (seenUrls.has(url) || seenTitles.has(title)) return;
    seenUrls.add(url);
    seenTitles.add(title);

    items.push({ portalSlug: config.slug, url, title });
  });

  return items;
}
