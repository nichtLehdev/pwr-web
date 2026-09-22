/**
 * Eine abweichende Rechnungsadresse macht ihre Anschrift aus, nicht ihr Name: eine
 * Kirchengemeinde nennt oft keine Ansprechperson. Formular, Server und Rechnung
 * prüfen darum dieselbe Regel.
 */

export interface BillingAddressFields {
  billingStreet?: string | null;
  billingZipCode?: string | null;
  billingCity?: string | null;
}

/** Pflichtfelder einer abweichenden Rechnungsadresse, in Formularreihenfolge. */
export const BILLING_ADDRESS_FIELDS = [
  "billingStreet",
  "billingZipCode",
  "billingCity",
] as const;

export type BillingAddressField = (typeof BILLING_ADDRESS_FIELDS)[number];

/** Wie die Felder im Formular heißen — für Meldungen, die sie beim Namen nennen. */
export const BILLING_ADDRESS_LABELS: Record<BillingAddressField, string> = {
  billingStreet: "Straße und Hausnummer",
  billingZipCode: "PLZ",
  billingCity: "Ort",
};

/** Leerzeichen zählen nicht als Angabe. */
export const isFilled = (value: string | null | undefined) =>
  (value ?? "").trim().length > 0;

export function missingBillingAddressFields(
  fields: BillingAddressFields,
): BillingAddressField[] {
  return BILLING_ADDRESS_FIELDS.filter((field) => !isFilled(fields[field]));
}

/** Eine Anschrift, an die sich eine Rechnung schicken lässt. */
export function hasBillingAddress(fields: BillingAddressFields): boolean {
  return missingBillingAddressFields(fields).length === 0;
}
