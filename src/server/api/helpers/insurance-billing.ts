import type { PrismaClient } from "~/generated/prisma/client";
import { formatEuro, formatLongDate } from "@/lib/invoice-document";
import {
  DEFAULT_INSURANCE_CLOSING_TEXT,
  DEFAULT_INSURANCE_EMAIL_BODY,
  DEFAULT_INSURANCE_EMAIL_SUBJECT,
  DEFAULT_INSURANCE_INTRO_TEXT,
  DEFAULT_INSURANCE_REFERENCE_PREFIX,
  DEFAULT_INSURANCE_SIGNATURE,
  DEFAULT_INSURANCE_TAX_RATE,
  fillInsurancePlaceholders,
  formatTaxRate,
  insuranceChoirLabel,
  insuranceInvoiceFilename,
  insuranceInvoiceLines,
  insuranceInvoiceTotal,
  insurancePaymentReference,
  parseInsuranceQuantities,
  parseInsuranceRates,
  type InsurancePlaceholderKey,
  type InsuranceRate,
} from "@/lib/insurance-billing";
import { renderInsuranceInvoicePdf } from "@/lib/insurance-invoice-render";
import { loadLogoBase64 } from "./invoice-pdf";

/** Einstellungen mit eingesetzten Standardtexten; legt nichts an. */
export async function loadInsuranceSettings(
  db: Pick<PrismaClient, "insuranceBillingSettings">,
) {
  const row = await db.insuranceBillingSettings.findUnique({
    where: { id: 1 },
  });
  return {
    taxRate: row?.taxRate ?? DEFAULT_INSURANCE_TAX_RATE,
    paymentReferencePrefix:
      row?.paymentReferencePrefix ?? DEFAULT_INSURANCE_REFERENCE_PREFIX,
    introText: row?.introText ?? DEFAULT_INSURANCE_INTRO_TEXT,
    closingText: row?.closingText ?? DEFAULT_INSURANCE_CLOSING_TEXT,
    signatureName: row?.signatureName ?? DEFAULT_INSURANCE_SIGNATURE,
    emailSubject: row?.emailSubject ?? DEFAULT_INSURANCE_EMAIL_SUBJECT,
    emailBody: row?.emailBody ?? DEFAULT_INSURANCE_EMAIL_BODY,
    updatedAt: row?.updatedAt ?? null,
  };
}

/** Nettoprämie laut Tabelle je Wertklasse, wie sie im Lauf steht. */
export interface SheetRate {
  maxValue: number;
  netPremium: number | null;
}

export function parseSheetRates(value: unknown): SheetRate[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((raw): SheetRate[] => {
      if (!raw || typeof raw !== "object") return [];
      const entry = raw as Record<string, unknown>;
      const maxValue = Number(entry.maxValue);
      if (!Number.isFinite(maxValue)) return [];
      const net = entry.netPremium === null ? null : Number(entry.netPremium);
      return [
        {
          maxValue,
          netPremium: net !== null && Number.isFinite(net) ? net : null,
        },
      ];
    })
    .sort((a, b) => a.maxValue - b.maxValue);
}

/** Startwerte eines neuen Laufs: jede Wertklasse mit lesbarer Tabellenprämie. */
export function sheetInsuranceRates(sheetRates: SheetRate[]): InsuranceRate[] {
  return sheetRates.flatMap((sheet) =>
    sheet.netPremium === null
      ? []
      : [
          {
            maxValue: sheet.maxValue,
            netPremium: sheet.netPremium,
            source: "sheet" as const,
          },
        ],
  );
}

/** Was PDF, Mail und Beträge von einem Lauf brauchen — eingefroren oder live. */
export interface EffectiveInsuranceRun {
  draft: boolean;
  year: number;
  invoiceDate: Date;
  dueDate: Date;
  taxRate: number;
  paymentReferencePrefix: string;
  rates: InsuranceRate[];
  /** Wertklassen der Tabelle ohne Prämie im Lauf; blockieren das Ausstellen. */
  missingRates: number[];
  introText: string;
  closingText: string;
  signatureName: string;
}

export interface InsuranceRunRecord {
  status: "DRAFT" | "ISSUED";
  year: number;
  invoiceDate: Date;
  dueDate: Date;
  sheetRates: unknown;
  taxRate: number | null;
  paymentReferencePrefix: string | null;
  rates: unknown;
  introText: string | null;
  closingText: string | null;
  signatureName: string | null;
}

/**
 * Prämien kommen immer aus dem Lauf. Steuersatz und Texte: ausgestellt wie beim
 * Ausstellen eingefroren, im Entwurf wie Kursrechnungs-Entwürfe die aktuellen
 * Einstellungen.
 */
export async function effectiveInsuranceRun(
  db: Pick<PrismaClient, "insuranceBillingSettings">,
  run: InsuranceRunRecord,
): Promise<EffectiveInsuranceRun> {
  const rates = parseInsuranceRates(run.rates);
  const missingRates = parseSheetRates(run.sheetRates)
    .map((sheet) => sheet.maxValue)
    .filter((maxValue) => !rates.some((rate) => rate.maxValue === maxValue));
  const base = {
    year: run.year,
    invoiceDate: run.invoiceDate,
    dueDate: run.dueDate,
    rates,
    missingRates,
  };
  if (run.status === "ISSUED") {
    return {
      ...base,
      draft: false,
      taxRate: run.taxRate ?? DEFAULT_INSURANCE_TAX_RATE,
      paymentReferencePrefix:
        run.paymentReferencePrefix ?? DEFAULT_INSURANCE_REFERENCE_PREFIX,
      introText: run.introText ?? DEFAULT_INSURANCE_INTRO_TEXT,
      closingText: run.closingText ?? DEFAULT_INSURANCE_CLOSING_TEXT,
      signatureName: run.signatureName?.trim() || DEFAULT_INSURANCE_SIGNATURE,
    };
  }
  const settings = await loadInsuranceSettings(db);
  return {
    ...base,
    draft: true,
    taxRate: settings.taxRate,
    paymentReferencePrefix: settings.paymentReferencePrefix,
    introText: settings.introText,
    closingText: settings.closingText,
    signatureName: settings.signatureName.trim() || DEFAULT_INSURANCE_SIGNATURE,
  };
}

export interface InsuranceInvoiceForPdf {
  choirNumber: string;
  choirName: string | null;
  recipientName1: string | null;
  recipientName2: string | null;
  recipientStreet: string | null;
  recipientCity: string | null;
  quantities: unknown;
}

export function insuranceInvoiceSummary(
  run: EffectiveInsuranceRun,
  invoice: InsuranceInvoiceForPdf,
) {
  const lines = insuranceInvoiceLines(
    run.rates,
    parseInsuranceQuantities(invoice.quantities),
    run.taxRate,
  );
  const total = insuranceInvoiceTotal(lines);
  const paymentReference = insurancePaymentReference(
    run.paymentReferencePrefix,
    invoice.choirNumber,
  );
  const placeholders: Record<InsurancePlaceholderKey, string> = {
    jahr: String(run.year),
    chor: insuranceChoirLabel(invoice),
    chornummer: invoice.choirNumber,
    betrag: formatEuro(total),
    faellig: formatLongDate(run.dueDate),
    verwendungszweck: paymentReference,
    steuersatz: formatTaxRate(run.taxRate),
  };
  return { lines, total, paymentReference, placeholders };
}

export async function renderInsuranceInvoice(
  run: EffectiveInsuranceRun,
  invoice: InsuranceInvoiceForPdf,
): Promise<{ filename: string; bytes: Uint8Array }> {
  const { lines, paymentReference, placeholders } = insuranceInvoiceSummary(
    run,
    invoice,
  );
  const bytes = await renderInsuranceInvoicePdf(
    {
      year: run.year,
      invoiceDate: run.invoiceDate,
      dueDate: run.dueDate,
      choirNumber: invoice.choirNumber,
      choirName: invoice.choirName,
      recipient: {
        name1: invoice.recipientName1,
        name2: invoice.recipientName2,
        street: invoice.recipientStreet,
        city: invoice.recipientCity,
      },
      lines,
      paymentReference,
      introText: fillInsurancePlaceholders(run.introText, placeholders),
      closingText: fillInsurancePlaceholders(run.closingText, placeholders),
      signatureName: run.signatureName,
      draft: run.draft,
    },
    { logoBase64: await loadLogoBase64() },
  );
  return {
    filename: insuranceInvoiceFilename(run.year, invoice.choirNumber),
    bytes,
  };
}
