const TRACKING_PARAMS = /^(utm_|fbclid$|gclid$|ref$|rfr$|src$|source$)/;

/**
 * Normaliza un href de portada: lo absolutiza contra la base, descarta
 * esquemas no-http y URLs de otro dominio, y limpia hash y parámetros de tracking.
 */
export function normalizeUrl(href: string | undefined, baseUrl: string): string | null {
  if (!href) return null;

  let url: URL;
  try {
    url = new URL(href.trim(), baseUrl);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!isSameDomain(url.hostname, new URL(baseUrl).hostname)) return null;

  url.hash = "";
  for (const param of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.test(param)) url.searchParams.delete(param);
  }

  return url.href;
}

/** Compara dominios ignorando el subdominio "www". */
function isSameDomain(hostname: string, baseHostname: string): boolean {
  const strip = (h: string) => h.replace(/^www\./, "");
  return strip(hostname) === strip(baseHostname);
}
