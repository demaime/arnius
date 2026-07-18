import type { CheerioAPI } from "cheerio";

export type PortalEncoding = "utf-8" | "latin1";

export interface PortalConfig {
  slug: string;
  name: string;
  baseUrl: string;
  encoding: PortalEncoding;
  frontPage: {
    /** Selector de cada ítem de portada. */
    itemSelector: string;
    /** Selector del título, relativo al ítem. Si falta, se usa el texto del propio ítem. */
    titleSelector?: string;
    /** Dónde está el href: en el propio ítem (que es un <a>) o en el primer <a> descendiente. */
    hrefFrom: "self" | "child-a";
  };
  article: {
    /** Selector del primer párrafo del cuerpo, para la vista previa. */
    summarySelector: string;
    /**
     * Fallbacks de fecha en texto humano, solo si la cascada genérica
     * (ld+json → meta → <time datetime>) no encuentra nada.
     */
    dateFallbacks?: Array<($: CheerioAPI) => string | undefined>;
  };
}
