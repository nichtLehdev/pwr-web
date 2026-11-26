/**
 * Versicherungsabrechnung der Geschäftsstelle: Wertklassen, Beträge und Texte.
 * Abhängigkeitsfrei, damit Dashboard, Router und PDF dieselbe Rechnung rechnen.
 */

import {
  DEFAULT_OFFICE_SIGNATURE,
  OFFICE_PLACEHOLDERS,
  fillPlaceholders,
  officeInvoiceFilename,
  officeMemberLabel,
  officePaymentReference,
  round2,
} from "./office-billing";

export { splitEmailList } from "./office-billing";

/** Woher die Nettoprämie einer Wertklasse in einem Lauf stammt. */
export type InsuranceRateSource = "manual" | "sheet";

export interface InsuranceRate {
  /** Obergrenze der Wertklasse in Euro, z.B. 1250. */
  maxValue: number;
  /** Nettoprämie je Instrument, ohne Versicherungssteuer. */
  netPremium: number;
  source: InsuranceRateSource;
}

export interface InsuranceQuantity {
  maxValue: number;
  quantity: number;
}

export interface InsuranceInvoiceLine {
  maxValue: number;
  quantity: number;
  /** Bruttoprämie je Instrument, inkl. Versicherungssteuer, auf Cent gerundet. */
  unitPrice: number;
  amount: number;
}

/** Wertklassen des Rahmenvertrags; die Tabelle kann weitere mitbringen. */
export const STANDARD_INSURANCE_CATEGORIES = [
  1250, 2500, 5000, 7500, 10000, 15000,
] as const;

export const DEFAULT_INSURANCE_TAX_RATE = 0.19;
export const DEFAULT_INSURANCE_REFERENCE_PREFIX = "0130";

export const DEFAULT_INSURANCE_INTRO_TEXT =
  "Sehr geehrtes Mitglied,\n\nfür die über unseren Rahmenvertrag abgeschlossene Versicherung stellen wir die fälligen Prämien in Rechnung. Die ausgewiesenen Beträge beinhalten die z. Zt. gültige Versicherungssteuer von {steuersatz}.";

export const DEFAULT_INSURANCE_CLOSING_TEXT =
  "Vielen Dank für Ihre Unterstützung!";

export const DEFAULT_INSURANCE_SIGNATURE = DEFAULT_OFFICE_SIGNATURE;

export const DEFAULT_INSURANCE_EMAIL_SUBJECT =
  "Versicherungsbeitrag {jahr} – {chor}";

export const DEFAULT_INSURANCE_EMAIL_BODY = `Sehr geehrte Damen und Herren,

anbei erhalten Sie die Rechnung über den Versicherungsbeitrag für das Jahr {jahr} ({chor}, Chor-Nr. {chornummer}).

Bitte überweisen Sie {betrag} bis zum {faellig} und geben Sie als Verwendungszweck {verwendungszweck} an.

Bei Fragen antworten Sie einfach auf diese E-Mail.

Mit freundlichen Grüßen
Ihr Posaunenwerk der Evangelischen Kirche im Rheinland e.V.`;

/** Platzhalter für Rechnungs- und Mailtexte, mit Erklärung für das Dashboard. */
export const INSURANCE_PLACEHOLDERS = [
  ...OFFICE_PLACEHOLDERS,
  { key: "steuersatz", label: "Versicherungssteuer, z. B. 19 %" },
] as const;

export type InsurancePlaceholderKey =
  (typeof INSURANCE_PLACEHOLDERS)[number]["key"];

/** Unbekannte Platzhalter bleiben stehen, damit ein Tippfehler auffällt. */
export function fillInsurancePlaceholders(
  template: string,
  values: Record<InsurancePlaceholderKey, string>,
): string {
  return fillPlaceholders(template, values);
}

/** Bruttoprämie je Stück — so steht sie auf der Rechnung, so wird multipliziert. */
export function grossPremium(netPremium: number, taxRate: number): number {
  return round2(netPremium * (1 + taxRate));
}

/** Eine Zeile je Wertklasse des Laufs, auch ohne Instrumente — wie im bisherigen Brief. */
export function insuranceInvoiceLines(
  rates: InsuranceRate[],
  quantities: InsuranceQuantity[],
  taxRate: number,
): InsuranceInvoiceLine[] {
  return rates.map((rate) => {
    const quantity =
      quantities.find((entry) => entry.maxValue === rate.maxValue)?.quantity ??
      0;
    const unitPrice = grossPremium(rate.netPremium, taxRate);
    return {
      maxValue: rate.maxValue,
      quantity,
      unitPrice,
      amount: round2(quantity * unitPrice),
    };
  });
}

export function insuranceInvoiceTotal(lines: InsuranceInvoiceLine[]): number {
  return round2(lines.reduce((sum, line) => sum + line.amount, 0));
}

const wholeEuro = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });

/** "Wert bis 1.250 €" */
export function insuranceCategoryLabel(maxValue: number): string {
  return `Wert bis ${wholeEuro.format(maxValue)} €`;
}

/** "19 %" bzw. "19,5 %" */
export function formatTaxRate(taxRate: number): string {
  return `${(taxRate * 100).toLocaleString("de-DE", { maximumFractionDigits: 2 })} %`;
}

/** Verwendungszweck wie bisher: "0130/02-07". */
export const insurancePaymentReference = officePaymentReference;

export const insuranceChoirLabel = officeMemberLabel;

export function insuranceInvoiceFilename(
  year: number,
  choirNumber: string,
): string {
  return officeInvoiceFilename("Versicherungsbeitrag", year, choirNumber);
}

/** Die im Lauf gespeicherten Wertklassen, nach Prüfung. */
export function parseInsuranceRates(value: unknown): InsuranceRate[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((raw): InsuranceRate[] => {
      if (!raw || typeof raw !== "object") return [];
      const entry = raw as Record<string, unknown>;
      const maxValue = Number(entry.maxValue);
      const netPremium = Number(entry.netPremium);
      if (!Number.isFinite(maxValue) || !Number.isFinite(netPremium)) return [];
      return [
        {
          maxValue,
          netPremium,
          // "settings" stammt aus der Zeit globaler Prämien.
          source:
            entry.source === "manual" || entry.source === "settings"
              ? "manual"
              : "sheet",
        },
      ];
    })
    .sort((a, b) => a.maxValue - b.maxValue);
}

export function parseInsuranceQuantities(value: unknown): InsuranceQuantity[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw): InsuranceQuantity[] => {
    if (!raw || typeof raw !== "object") return [];
    const entry = raw as Record<string, unknown>;
    const maxValue = Number(entry.maxValue);
    const quantity = Number(entry.quantity);
    if (!Number.isFinite(maxValue) || !Number.isFinite(quantity)) return [];
    return [{ maxValue, quantity }];
  });
}
