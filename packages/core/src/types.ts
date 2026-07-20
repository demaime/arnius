/** Un ítem extraído de la portada de un portal, antes de enriquecer. */
export interface FrontPageItem {
  portalSlug: string;
  url: string;
  title: string;
}

/** Artículo listo para insertar en la base. */
export interface ArticleInsert {
  portalSlug: string;
  url: string;
  title: string;
  summary: string | null;
  author: string | null;
  publishedAt: string | null; // ISO 8601 UTC
}

/** Resultado de scrapear la nota individual (fecha + primer párrafo + firma). */
export interface ArticleData {
  publishedAt: string | null; // ISO 8601 UTC
  summary: string | null;
  author: string | null;
}
