/**
 * Gemeinsames der Beitragsabrechnungen der Geschäftsstelle (Versicherung,
 * Mitgliedsbeiträge): Beträge, Verwendungszweck, Adressen, Platzhalter.
 * Abhängigkeitsfrei, damit Dashboard, Router und PDF dasselbe rechnen.
 */

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Verwendungszweck wie bisher: Kennung, Schrägstrich, Chor-Nr. ("0130/02-07"). */
export function officePaymentReference(
  prefix: string,
  memberNumber: string,
): string {
  const trimmed = prefix.trim();
  return trimmed ? `${trimmed}/${memberNumber}` : memberNumber;
}

/** Erste Adresse ist der Empfänger, weitere gehen in Kopie. */
export function splitEmailList(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter((part) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(part));
}

/** Rechnungsname: die Bezeichnung aus der Tabelle, sonst der Empfänger. */
export function officeMemberLabel(invoice: {
  choirName?: string | null;
  recipientName1?: string | null;
  choirNumber: string;
}): string {
  return (
    invoice.choirName?.trim() ||
    invoice.recipientName1?.trim() ||
    `Chor ${invoice.choirNumber}`
  );
}

/** Dateiname, der Mailprogramme und Windows übersteht. */
export function officeInvoiceFilename(
  prefix: string,
  year: number,
  memberNumber: string,
): string {
  const safe = memberNumber
    .replace(/[^A-Za-z0-9-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${prefix}_${year}_${safe || "Chor"}.pdf`;
}

/** Unbekannte Platzhalter bleiben stehen, damit ein Tippfehler auffällt. */
export function fillPlaceholders(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key]! : match,
  );
}

/** Platzhalter, die jede Beitragsrechnung kennt. */
export const OFFICE_PLACEHOLDERS = [
  { key: "jahr", label: "Beitragsjahr" },
  { key: "chor", label: "Name des Chors" },
  { key: "chornummer", label: "Chor-Nr." },
  { key: "betrag", label: "Gesamtbetrag" },
  { key: "faellig", label: "Zahlungsziel" },
  { key: "verwendungszweck", label: "Verwendungszweck" },
] as const;

export type OfficePlaceholderKey = (typeof OFFICE_PLACEHOLDERS)[number]["key"];

export const DEFAULT_OFFICE_SIGNATURE =
  "Ihr Posaunenwerk der Evangelischen Kirche im Rheinland e.V.";
