/**
 * Mitgliedsbeitragsabrechnung der Geschäftsstelle: Sätze, Positionen und Texte.
 * Abhängigkeitsfrei, damit Dashboard, Router und PDF dieselbe Rechnung rechnen.
 *
 * Aufbau wie im bisherigen Brief:
 *   1 Grundbeitrag Chor / Beitrag Einzelmitglied
 *   2 Staffelbeitrag je Chormitglied (mit / ohne eigenes Einkommen),
 *     bzw. der von Hand eingetragene Vorjahresbetrag
 *   3 Bezugspreis Zeitschrift „POSAUNENCHOR“
 *   4 Rückständiger Beitrag für das Vorjahr
 */
import { formatEuro } from "./invoice-document";
import {
  DEFAULT_OFFICE_SIGNATURE,
  OFFICE_PLACEHOLDERS,
  officeInvoiceFilename,
  round2,
} from "./office-billing";

export interface MembershipRates {
  /** Grundbeitrag je Chor bzw. Beitrag je Einzelmitglied. */
  baseFee: number;
  rateWithIncome: number;
  rateWithoutIncome: number;
  /** Je Heft „POSAUNENCHOR“. */
  magazinePrice: number;
}

export type MembershipRateKey = keyof MembershipRates;
export type MembershipRateSource = "manual" | "sheet";

/** Sätze laut Formeln der Tabelle; null, wo keine Formel lesbar war. */
export type SheetMembershipRates = Record<MembershipRateKey, number | null>;

export const MEMBERSHIP_RATE_FIELDS: {
  key: MembershipRateKey;
  label: string;
  hint: string;
}[] = [
  {
    key: "baseFee",
    label: "Grundbeitrag",
    hint: "je Chor bzw. Einzelmitglied",
  },
  {
    key: "rateWithIncome",
    label: "Mit eigenem Einkommen",
    hint: "je Chormitglied",
  },
  {
    key: "rateWithoutIncome",
    label: "Ohne eigenes Einkommen",
    hint: "je Chormitglied",
  },
  {
    key: "magazinePrice",
    label: "Zeitschrift „POSAUNENCHOR“",
    hint: "je Heft",
  },
];

export const MEMBERSHIP_RATE_KEYS = MEMBERSHIP_RATE_FIELDS.map(
  (field) => field.key,
);

export const DEFAULT_MEMBERSHIP_REFERENCE_PREFIX = "1174";

export const DEFAULT_MEMBERSHIP_INTRO_TEXT =
  "Sehr geehrtes Mitglied,\n\ngemäß Beschluss der Vertreterversammlung vom 01.03.2014 stellen wir hiermit den Jahresbeitrag {jahr} in Rechnung.";

export const DEFAULT_MEMBERSHIP_CLOSING_TEXT =
  "Vielen Dank für Ihre Unterstützung!";

export const DEFAULT_MEMBERSHIP_SIGNATURE = DEFAULT_OFFICE_SIGNATURE;

export const DEFAULT_MEMBERSHIP_EMAIL_SUBJECT =
  "Mitgliedsbeitrag {jahr} – {chor}";

export const DEFAULT_MEMBERSHIP_EMAIL_BODY = `Sehr geehrte Damen und Herren,

anbei erhalten Sie die Rechnung über den Mitgliedsbeitrag für das Jahr {jahr} ({chor}, Chor-Nr. {chornummer}).

Bitte überweisen Sie {betrag} bis zum {faellig} und geben Sie als Verwendungszweck {verwendungszweck} an.

Bei Fragen antworten Sie einfach auf diese E-Mail.

Mit freundlichen Grüßen
Ihr Posaunenwerk der Evangelischen Kirche im Rheinland e.V.`;

export const MEMBERSHIP_PLACEHOLDERS = OFFICE_PLACEHOLDERS;

/** Was eine Zeile der Mitgliedertabelle für die Rechnung beiträgt. */
export interface MembershipInvoiceInput {
  membersWithIncome: number | null;
  membersWithoutIncome: number | null;
  graduatedFeeFixed: number | null;
  magazineCount: number;
  arrears: number;
  sheetTotal: number | null;
  sheetTotalFixed: boolean;
}

export type MembershipLineKey =
  "base" | "graduated" | "magazine" | "arrears" | "adjustment";

export interface MembershipInvoiceLine {
  key: MembershipLineKey;
  label: string;
  /** Rechnung hinter dem Betrag, eine Zeile je Eintrag. */
  details: string[];
  amount: number;
}

function members(count: number, label: string, rate: number): string {
  return `${count} ${count === 1 ? "Mitglied" : "Mitglieder"} ${label} je ${formatEuro(rate)}`;
}

/**
 * Positionen in der Reihenfolge des bisherigen Briefs. Staffelbeitrag,
 * Zeitschrift und Rückstand erscheinen nur, wenn es sie gibt — ein
 * Einzelmitglied bekommt keine „0 Mitglieder“-Zeile. Ist der Gesamtbetrag in
 * der Tabelle von Hand eingetragen, gilt er; die Differenz steht als eigene
 * Position da, damit die Rechnung aufgeht.
 */
export function membershipInvoiceLines(
  rates: MembershipRates,
  input: MembershipInvoiceInput,
): MembershipInvoiceLine[] {
  const lines: MembershipInvoiceLine[] = [
    {
      key: "base",
      label: "Grundbeitrag Chor / Beitrag Einzelmitglied",
      details: [],
      amount: rates.baseFee,
    },
  ];

  const withIncome = input.membersWithIncome ?? 0;
  const withoutIncome = input.membersWithoutIncome ?? 0;
  const hasCounts =
    input.membersWithIncome !== null || input.membersWithoutIncome !== null;
  const countDetails = [
    members(withoutIncome, "ohne eigenes Einkommen", rates.rateWithoutIncome),
    members(withIncome, "mit eigenem Einkommen", rates.rateWithIncome),
  ];

  if (input.graduatedFeeFixed !== null) {
    lines.push({
      key: "graduated",
      label: "Staffelbeitrag je Chormitglied",
      details: hasCounts
        ? ["Betrag laut Geschäftsstelle"]
        : ["Im Vorjahr bezahlter Betrag, da keine Mitgliederzahlen gemeldet"],
      amount: round2(input.graduatedFeeFixed),
    });
  } else if (hasCounts) {
    lines.push({
      key: "graduated",
      label: "Staffelbeitrag je Chormitglied",
      details: countDetails,
      amount: round2(
        withIncome * rates.rateWithIncome +
          withoutIncome * rates.rateWithoutIncome,
      ),
    });
  }

  if (input.magazineCount > 0) {
    lines.push({
      key: "magazine",
      label: "Bezugspreis Zeitschrift „POSAUNENCHOR“",
      details: [
        `${input.magazineCount} ${input.magazineCount === 1 ? "Heft" : "Hefte"} je ${formatEuro(rates.magazinePrice)}`,
      ],
      amount: round2(input.magazineCount * rates.magazinePrice),
    });
  }

  if (Math.abs(input.arrears) > 0.005) {
    lines.push({
      key: "arrears",
      label: "Rückständiger Beitrag für das Vorjahr",
      details: [],
      amount: round2(input.arrears),
    });
  }

  if (input.sheetTotalFixed && input.sheetTotal !== null) {
    const difference = round2(input.sheetTotal - membershipLinesSum(lines));
    if (Math.abs(difference) > 0.005) {
      lines.push({
        key: "adjustment",
        label: "Anpassung laut Geschäftsstelle",
        details: [],
        amount: difference,
      });
    }
  }

  return lines;
}

function membershipLinesSum(lines: MembershipInvoiceLine[]): number {
  return round2(lines.reduce((sum, line) => sum + line.amount, 0));
}

export function membershipInvoiceTotal(lines: MembershipInvoiceLine[]): number {
  return membershipLinesSum(lines);
}

export function membershipInvoiceFilename(
  year: number,
  choirNumber: string,
): string {
  return officeInvoiceFilename("Mitgliedsbeitrag", year, choirNumber);
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/** Die im Lauf gespeicherten Tabellensätze, nach Prüfung. */
export function parseSheetMembershipRates(
  value: unknown,
): SheetMembershipRates {
  const entry =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return {
    baseFee: numberOrNull(entry.baseFee),
    rateWithIncome: numberOrNull(entry.rateWithIncome),
    rateWithoutIncome: numberOrNull(entry.rateWithoutIncome),
    magazinePrice: numberOrNull(entry.magazinePrice),
  };
}

/** Sätze eines Laufs; `values` null heißt: unbekannt, blockiert das Ausstellen. */
export interface RunMembershipRates {
  values: SheetMembershipRates;
  sources: Record<MembershipRateKey, MembershipRateSource>;
}

export function parseRunMembershipRates(value: unknown): RunMembershipRates {
  const entry =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const sources =
    entry.sources && typeof entry.sources === "object"
      ? (entry.sources as Record<string, unknown>)
      : {};
  const values = parseSheetMembershipRates(entry);
  const resolvedSources = {} as Record<MembershipRateKey, MembershipRateSource>;
  for (const key of MEMBERSHIP_RATE_KEYS) {
    resolvedSources[key] =
      sources[key] === "manual" || sources[key] === "settings"
        ? "manual"
        : "sheet";
  }
  return { values, sources: resolvedSources };
}

/** Startwerte eines neuen Laufs: die Sätze aus den Formeln der Tabelle. */
export function sheetRunMembershipRates(
  sheet: SheetMembershipRates,
): RunMembershipRates {
  return {
    values: { ...sheet },
    sources: {
      baseFee: "sheet",
      rateWithIncome: "sheet",
      rateWithoutIncome: "sheet",
      magazinePrice: "sheet",
    },
  };
}

/** So steht es in der Spalte `rates`. */
export function serializeRunMembershipRates(rates: RunMembershipRates) {
  return { ...rates.values, sources: { ...rates.sources } };
}
