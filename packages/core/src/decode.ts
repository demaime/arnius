import type { PortalEncoding } from "./portals/types";

/**
 * Decodifica el HTML detectando el charset declarado en la propia página
 * (meta charset / http-equiv). Si no hay declaración usa el encoding por
 * defecto del portal. Necesario porque hay portales que mezclan: p. ej.
 * La Política Online sirve la portada en ISO-8859-1 y las notas en UTF-8.
 */
export function decodeHtml(buffer: Uint8Array, fallback: PortalEncoding): string {
  const head = new TextDecoder("latin1").decode(buffer.slice(0, 2048));
  const match = /charset\s*=\s*["']?\s*([a-zA-Z0-9_-]+)/i.exec(head);

  let encoding: string = fallback;
  if (match) {
    const declared = match[1]!.toLowerCase();
    if (declared === "utf-8" || declared === "utf8") encoding = "utf-8";
    else if (declared === "iso-8859-1" || declared === "latin1" || declared === "windows-1252")
      encoding = "windows-1252"; // superset de latin1, correcto para es-AR
  }

  try {
    return new TextDecoder(encoding).decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}
