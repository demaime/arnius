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
  publishedAt: string | null; // ISO 8601 UTC
}
