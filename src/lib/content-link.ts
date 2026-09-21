/**
 * Verweise auf eigene Inhalte. Geteilt von Editor-Dialog, tRPC und Mailversand,
 * damit alle drei dieselben Pfade bilden.
 */

export const LINK_TARGET_TYPES = [
  "post",
  "event",
  "course",
  "ensemble",
  "auswahlchor",
] as const;

export type LinkTargetType = (typeof LINK_TARGET_TYPES)[number];

export interface LinkTarget {
  id: string;
  type: LinkTargetType;
  title: string;
  href: string;
  /** Datum (ISO), Ort oder Untertitel — je nach Art, zur Unterscheidung gleicher Titel. */
  hint: string | null;
}

export const LINK_TARGET_LABELS: Record<LinkTargetType, string> = {
  post: "Beitrag",
  event: "Termin",
  course: "Lehrgang",
  ensemble: "Chor",
  auswahlchor: "Auswahlchor",
};

const PREFIXES: Record<Exclude<LinkTargetType, "auswahlchor">, string> = {
  post: "/aktuelles",
  event: "/termine/event",
  course: "/termine/course",
  ensemble: "/ensembles",
};

/**
 * Verlinkt wird die UUID, nicht der Slug: Der Slug ändert sich mit dem Titel und
 * risse jeden gespeicherten Verweis ab. Die Detailrouten leiten die UUID dauerhaft
 * auf die sprechende Adresse um, der Leser landet also trotzdem dort.
 */
export function linkHref(
  type: Exclude<LinkTargetType, "auswahlchor">,
  id: string,
): string {
  return `${PREFIXES[type]}/${id}`;
}

/** Auswahlchöre haben keine Detailseite; das Ziel ist ihr Abschnitt auf der Sammelseite. */
export function auswahlchorLinkHref(slug: string): string {
  return `/ueber-uns/auswahlchoere#${slug}`;
}

/**
 * Macht seiteneigene Verweise verschickbar: In einer Mail zeigt „/aktuelles/…"
 * ins Leere, weil das Mailprogramm keine Basisadresse kennt.
 */
export function absolutizeHtmlLinks(html: string, baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  return html.replace(
    /(<a\b[^>]*\bhref=")(\/[^"/][^"]*|\/)"/gi,
    (_match, before: string, path: string) => `${before}${base}${path}"`,
  );
}
