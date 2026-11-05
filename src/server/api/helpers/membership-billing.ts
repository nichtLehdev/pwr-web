import type { PrismaClient } from "~/generated/prisma/client";
import { formatEuro, formatLongDate } from "@/lib/invoice-document";
import {
  fillPlaceholders,
  officeMemberLabel,
  officePaymentReference,
  type OfficePlaceholderKey,
} from "@/lib/office-billing";
import {
  DEFAULT_MEMBERSHIP_CLOSING_TEXT,
  DEFAULT_MEMBERSHIP_EMAIL_BODY,
  DEFAULT_MEMBERSHIP_EMAIL_SUBJECT,
  DEFAULT_MEMBERSHIP_INTRO_TEXT,
  DEFAULT_MEMBERSHIP_REFERENCE_PREFIX,
  DEFAULT_MEMBERSHIP_SIGNATURE,
  MEMBERSHIP_RATE_KEYS,
  membershipInvoiceFilename,
  membershipInvoiceLines,
  membershipInvoiceTotal,
  parseRunMembershipRates,
  type MembershipInvoiceInput,
  type MembershipRateKey,
  type MembershipRateSource,
  type MembershipRates,
} from "@/lib/membership-billing";
import { renderOfficeInvoicePdf } from "@/lib/office-invoice-render";
import { loadLogoBase64 } from "./invoice-pdf";

/** Einstellungen mit eingesetzten Standardtexten; legt nichts an. */
export async function loadMembershipSettings(
  db: Pick<PrismaClient, "membershipBillingSettings">,
) {
  const row = await db.membershipBillingSettings.findUnique({
    where: { id: 1 },
  });
  return {
    paymentReferencePrefix:
      row?.paymentReferencePrefix ?? DEFAULT_MEMBERSHIP_REFERENCE_PREFIX,
    introText: row?.introText ?? DEFAULT_MEMBERSHIP_INTRO_TEXT,
    closingText: row?.closingText ?? DEFAULT_MEMBERSHIP_CLOSING_TEXT,
    signatureName: row?.signatureName ?? DEFAULT_MEMBERSHIP_SIGNATURE,
    emailSubject: row?.emailSubject ?? DEFAULT_MEMBERSHIP_EMAIL_SUBJECT,
    emailBody: row?.emailBody ?? DEFAULT_MEMBERSHIP_EMAIL_BODY,
    updatedAt: row?.updatedAt ?? null,
  };
}

export interface EffectiveMembershipRun {
  draft: boolean;
  year: number;
  invoiceDate: Date;
  dueDate: Date;
  paymentReferencePrefix: string;
  rates: MembershipRates;
  sources: Record<MembershipRateKey, MembershipRateSource>;
  /** Sätze ohne Wert (weder in der Tabelle lesbar noch eingetragen); blockieren das Ausstellen. */
  missingRates: MembershipRateKey[];
  introText: string;
  closingText: string;
  signatureName: string;
}

export interface MembershipRunRecord {
  status: "DRAFT" | "ISSUED";
  year: number;
  invoiceDate: Date;
  dueDate: Date;
  sheetRates: unknown;
  paymentReferencePrefix: string | null;
  rates: unknown;
  introText: string | null;
  closingText: string | null;
  signatureName: string | null;
}

/**
 * Sätze kommen immer aus dem Lauf. Texte und Verwendungszweck: ausgestellt
 * eingefroren, im Entwurf die aktuellen Einstellungen.
 */
export async function effectiveMembershipRun(
  db: Pick<PrismaClient, "membershipBillingSettings">,
  run: MembershipRunRecord,
): Promise<EffectiveMembershipRun> {
  const { values, sources } = parseRunMembershipRates(run.rates);
  const rates = {} as MembershipRates;
  const missingRates: MembershipRateKey[] = [];
  for (const key of MEMBERSHIP_RATE_KEYS) {
    rates[key] = values[key] ?? 0;
    if (values[key] === null) missingRates.push(key);
  }
  const base = {
    year: run.year,
    invoiceDate: run.invoiceDate,
    dueDate: run.dueDate,
    rates,
    sources,
    missingRates,
  };
  if (run.status === "ISSUED") {
    return {
      ...base,
      draft: false,
      paymentReferencePrefix:
        run.paymentReferencePrefix ?? DEFAULT_MEMBERSHIP_REFERENCE_PREFIX,
      introText: run.introText ?? DEFAULT_MEMBERSHIP_INTRO_TEXT,
      closingText: run.closingText ?? DEFAULT_MEMBERSHIP_CLOSING_TEXT,
      signatureName: run.signatureName?.trim() || DEFAULT_MEMBERSHIP_SIGNATURE,
    };
  }
  const settings = await loadMembershipSettings(db);
  return {
    ...base,
    draft: true,
    paymentReferencePrefix: settings.paymentReferencePrefix,
    introText: settings.introText,
    closingText: settings.closingText,
    signatureName:
      settings.signatureName.trim() || DEFAULT_MEMBERSHIP_SIGNATURE,
  };
}

export interface MembershipInvoiceRecord extends MembershipInvoiceInput {
  choirNumber: string;
  choirName: string | null;
  recipientName1: string | null;
  recipientName2: string | null;
  recipientStreet: string | null;
  recipientCity: string | null;
}

export function membershipInvoiceSummary(
  run: EffectiveMembershipRun,
  invoice: MembershipInvoiceRecord,
) {
  const lines = membershipInvoiceLines(run.rates, invoice);
  const total = membershipInvoiceTotal(lines);
  const paymentReference = officePaymentReference(
    run.paymentReferencePrefix,
    invoice.choirNumber,
  );
  const placeholders: Record<OfficePlaceholderKey, string> = {
    jahr: String(run.year),
    chor: officeMemberLabel(invoice),
    chornummer: invoice.choirNumber,
    betrag: formatEuro(total),
    faellig: formatLongDate(run.dueDate),
    verwendungszweck: paymentReference,
  };
  return { lines, total, paymentReference, placeholders };
}

export async function renderMembershipInvoice(
  run: EffectiveMembershipRun,
  invoice: MembershipInvoiceRecord,
): Promise<{ filename: string; bytes: Uint8Array }> {
  const { lines, total, paymentReference, placeholders } =
    membershipInvoiceSummary(run, invoice);
  const bytes = await renderOfficeInvoicePdf(
    {
      title: `Mitgliedsbeitrag für das Jahr ${run.year}`,
      subtitle: invoice.choirName,
      invoiceDate: run.invoiceDate,
      dueDate: run.dueDate,
      infoRows: [
        ["Chor-Nr.", invoice.choirNumber],
        ["Beitragsjahr", String(run.year)],
      ],
      recipient: {
        name1: invoice.recipientName1,
        name2: invoice.recipientName2,
        street: invoice.recipientStreet,
        city: invoice.recipientCity,
      },
      table: {
        columns: [{ label: "Position" }, { label: "Betrag", rightOffset: 0 }],
        rows: lines.map((line, index) => ({
          position: String(index + 1),
          cells: [line.label, formatEuro(line.amount)],
          details: line.details,
        })),
      },
      total,
      paymentReference,
      introText: fillPlaceholders(run.introText, placeholders),
      closingText: fillPlaceholders(run.closingText, placeholders),
      signatureName: run.signatureName,
      draft: run.draft,
    },
    { logoBase64: await loadLogoBase64() },
  );
  return {
    filename: membershipInvoiceFilename(run.year, invoice.choirNumber),
    bytes,
  };
}
