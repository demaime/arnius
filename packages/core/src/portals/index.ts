import type { PortalConfig } from "./types";

export type { PortalConfig, PortalEncoding } from "./types";

/**
 * Configuración declarativa de los 11 portales.
 * Selectores verificados contra las portadas reales (fixtures en test/fixtures/front/).
 */
export const PORTALS: PortalConfig[] = [
  {
    slug: "infobae",
    name: "Infobae",
    baseUrl: "https://www.infobae.com/",
    encoding: "utf-8",
    frontPage: { itemSelector: "a.story-card-ctn", titleSelector: "h2", hrefFrom: "self" },
    article: {
      summarySelector: ".body-article p",
      dateFallbacks: [
        ($) =>
          $("span.share-bar-article-date-separator").text().trim() ||
          $("span.sharebar-article-date").text().trim(),
      ],
    },
  },
  {
    slug: "clarin",
    name: "Clarín",
    baseUrl: "https://www.clarin.com/",
    encoding: "utf-8",
    frontPage: { itemSelector: "article, .item", titleSelector: "h2", hrefFrom: "child-a" },
    article: {
      summarySelector: ".StoryTextContainer p",
      dateFallbacks: [($) => $("time.createDate").text().trim()],
    },
  },
  {
    slug: "lanacion",
    name: "La Nación",
    baseUrl: "https://www.lanacion.com.ar/",
    encoding: "utf-8",
    frontPage: { itemSelector: "article, .item", titleSelector: "h2", hrefFrom: "child-a" },
    article: {
      summarySelector: ".cuerpo__nota p",
      dateFallbacks: [
        ($) =>
          `${$("time.com-date").first().text().trim()} ${$("time.com-hour").first().text().trim()}`.trim(),
      ],
    },
  },
  {
    slug: "perfil",
    name: "Perfil",
    baseUrl: "https://www.perfil.com/",
    encoding: "utf-8",
    frontPage: { itemSelector: "article, .item", titleSelector: "h2", hrefFrom: "child-a" },
    article: {
      summarySelector: "#article-content p",
      dateFallbacks: [($) => $("time.article__date").text().trim()],
    },
  },
  {
    slug: "pagina12",
    name: "Página 12",
    baseUrl: "https://www.pagina12.com.ar/",
    encoding: "utf-8",
    frontPage: {
      itemSelector: ".p12-article-card-full",
      titleSelector: ".p12Heading.title",
      hrefFrom: "child-a",
    },
    article: { summarySelector: "article p" },
  },
  {
    slug: "ambito",
    name: "Ámbito",
    baseUrl: "https://www.ambito.com/",
    encoding: "utf-8",
    frontPage: { itemSelector: ".news-article__title", hrefFrom: "child-a" },
    article: {
      summarySelector: "article h2",
      dateFallbacks: [($) => $("[class*=publication-date]").first().text().trim()],
    },
  },
  {
    slug: "cronista",
    name: "El Cronista",
    baseUrl: "https://www.cronista.com/",
    encoding: "utf-8",
    frontPage: { itemSelector: "h2.story-card__headline", hrefFrom: "child-a" },
    article: { summarySelector: ".vsmcontent p" },
  },
  {
    slug: "lpo",
    name: "La Política Online",
    baseUrl: "https://www.lapoliticaonline.com/",
    encoding: "latin1",
    frontPage: { itemSelector: ".item", titleSelector: "h2", hrefFrom: "child-a" },
    article: {
      summarySelector: "#vsmcontent p",
      dateFallbacks: [($) => $(".time").first().text().trim()],
    },
  },
  {
    slug: "letrap",
    name: "Letra P",
    baseUrl: "https://www.letrap.com.ar/",
    encoding: "utf-8",
    frontPage: { itemSelector: "a.news-article", titleSelector: "h2", hrefFrom: "self" },
    article: {
      summarySelector: "article p",
      dateFallbacks: [($) => $("span.news-headline__date time").first().attr("datetime")],
    },
  },
  {
    slug: "cenital",
    name: "Cenital",
    baseUrl: "https://cenital.com/",
    encoding: "utf-8",
    frontPage: { itemSelector: "article", titleSelector: "h2, h3", hrefFrom: "child-a" },
    article: { summarySelector: "main p" },
  },
  {
    slug: "derechadiario",
    name: "La Derecha Diario",
    baseUrl: "https://derechadiario.com.ar/",
    encoding: "utf-8",
    frontPage: { itemSelector: "a:has(h2)", titleSelector: "h2", hrefFrom: "self" },
    article: { summarySelector: "#mvp-content-main p" },
  },
];

export function getPortal(slug: string): PortalConfig | undefined {
  return PORTALS.find((p) => p.slug === slug);
}
