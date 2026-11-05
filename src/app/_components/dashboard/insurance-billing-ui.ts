/** Gemeinsame Bausteine der Seiten unter /dashboard/geschaeftsstelle/versicherung. */

export const INSURANCE_BASE_PATH = "/dashboard/geschaeftsstelle/versicherung";

export const INSURANCE_BREADCRUMBS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Geschäftsstelle" },
  { label: "Versicherungsbeiträge", href: INSURANCE_BASE_PATH },
];

export const LINK_PRIMARY =
  "bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted semi-condensed inline-flex min-h-11 items-center gap-2 px-4 py-2.5 font-semibold transition-colors";
export const LINK_OUTLINE =
  "border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night semi-condensed inline-flex min-h-11 items-center gap-2 border px-4 py-2.5 font-semibold transition-colors";

/*
 * Für die kleinen festen Tabellen (Prämien mit Eingabefeldern), wo Suche und
 * Seiten der DataTable nichts bringen — optisch wie die DataTable.
 */
export const TABLE_WRAP = "overflow-x-auto";
export const TABLE = "w-full text-left text-sm";
export const THEAD =
  "semi-condensed border-rule dark:border-night-rule text-dark dark:text-night-muted border-b text-xs tracking-wide uppercase";
export const TBODY = "divide-rule dark:divide-night-rule divide-y";
export const TH = "px-4 py-2.5 text-left font-medium";
export const TH_NUM = `${TH} text-right`;
export const TD =
  "text-ink dark:text-night-text px-4 py-3 align-middle text-sm";
export const TD_NUM = `${TD} text-right tabular-nums whitespace-nowrap`;

/** "6,00" ↔ 6 — die Geschäftsstelle tippt mit Komma. Leer → null, Unsinn → NaN. */
export function parseEuroInput(value: string): number | null {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (normalized === "") return null;
  const number = Number(normalized);
  return Number.isFinite(number) && number >= 0 ? number : NaN;
}

export function euroInput(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

/** `yyyy-mm-dd` in Ortszeit für <input type="date">. */
export function dateInputValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

/** Mittag statt Mitternacht, damit kein Zeitzonensprung den Tag verschiebt. */
export function dateFromInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}
