import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { env } from "@/env";
import { berlinParts } from "@/lib/berlin-time";
import { splitEmailList } from "@/lib/office-billing";
import { maskEmail } from "@/lib/mask-email";
import { sendOfficeInvoiceEmail } from "@/server/email";
import { SheetError } from "@/server/utils/sheet-cells";
import type { createLogger } from "@/server/utils/logger";

/**
 * Was die Beitragsabrechnungen der Geschäftsstelle (Versicherung,
 * Mitgliedsbeiträge) im Router gemeinsam haben: Hochladen, Daten des Laufs,
 * Versand in Bündeln.
 */

/** Die Tabellen der Geschäftsstelle haben unter 100 KB; alles über 5 MB ist ein Versehen. */
const MAX_SHEET_BYTES = 5 * 1024 * 1024;
const DEFAULT_REPLY_TO = "info@posaunenwerk-rheinland.de";
/** Vier Wochen Zahlungsziel, wie bisher grob von Januar bis Mitte Februar. */
const DEFAULT_DUE_DAYS = 28;
const DAY_MS = 24 * 60 * 60 * 1000;

export const sheetUploadInput = z.object({
  filename: z.string().trim().min(1).max(255),
  /** Inhalt der .xlsx als Base64. */
  fileBase64: z.string().min(1),
});

/** Base64 → Buffer, Parserfehler als verständliche BAD_REQUEST. */
export async function readUploadedSheet<T>(
  fileBase64: string,
  parse: (buffer: Buffer) => Promise<T>,
): Promise<T> {
  const buffer = Buffer.from(fileBase64, "base64");
  if (buffer.byteLength === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Die Datei ist leer.",
    });
  }
  if (buffer.byteLength > MAX_SHEET_BYTES) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Die Datei ist größer als 5 MB.",
    });
  }
  try {
    return await parse(buffer);
  } catch (error) {
    if (error instanceof SheetError) {
      throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    }
    throw error;
  }
}

/** Beitragsjahr und Daten eines neuen Laufs; ab Oktober zählt schon das nächste Jahr. */
export function defaultRunDates(today = new Date()) {
  const { year, month } = berlinParts(today);
  return {
    year: year + (month >= 10 ? 1 : 0),
    invoiceDate: today,
    dueDate: new Date(today.getTime() + DEFAULT_DUE_DAYS * DAY_MS),
  };
}

export function parseWarnings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

export function creatorName(
  user: {
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null,
): string | null {
  if (!user) return null;
  return (
    user.displayName?.trim() ||
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
    null
  );
}

export const CREATOR_SELECT = {
  select: { displayName: true, firstName: true, lastName: true },
} as const;

/** Leerer Text heißt "Standard" und wird als null gespeichert. */
export const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform((value) => (value?.trim() ? value.trim() : null));

/** Eingabe-Schema der Texte; beide Abrechnungen haben dieselben fünf. */
export const billingTextsInput = {
  introText: optionalText(4000),
  closingText: optionalText(2000),
  signatureName: optionalText(200),
  emailSubject: optionalText(200),
  emailBody: optionalText(8000),
};

/** Komma-Liste prüfen und normalisieren; leer → null. */
export function normalizeEmailInput(input: string | null | undefined) {
  if (input === undefined) return undefined;
  const addresses = splitEmailList(input);
  if (input && addresses.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Keine gültige E-Mail-Adresse.",
    });
  }
  return addresses.length > 0 ? addresses.join(", ") : null;
}

export interface OfficeMail {
  subject: string;
  body: string;
  pdf: { filename: string; bytes: Uint8Array };
}

export interface SendSummary {
  test: boolean;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
}

type Logger = ReturnType<typeof createLogger>;

function sendMail(to: string, cc: string[], mail: OfficeMail, prefix = "") {
  return sendOfficeInvoiceEmail({
    to,
    cc,
    replyTo: env.CONTACT_EMAIL ?? DEFAULT_REPLY_TO,
    subject: prefix + mail.subject,
    body: mail.body,
    pdf: { filename: mail.pdf.filename, content: Buffer.from(mail.pdf.bytes) },
  });
}

/**
 * Schickt die erste Rechnung mit "[TEST]" an eine Adresse; verbucht nichts.
 */
export async function sendTestMail<I>(
  invoices: I[],
  testEmail: string,
  compose: (invoice: I) => Promise<OfficeMail>,
  log: Logger,
): Promise<SendSummary> {
  const sample = invoices[0];
  if (!sample) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Keine Rechnung für den Testversand vorhanden.",
    });
  }
  try {
    await sendMail(testEmail, [], await compose(sample), "[TEST] ");
  } catch (error) {
    log.error("Test send failed:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Testversand fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
  return { test: true, sentCount: 1, failedCount: 0, skippedCount: 0 };
}

/**
 * Versendet in begrenzten Bündeln wie der Kursmailversand: nacheinander dauerte
 * zu lange, alle auf einmal überrollt den SMTP-Server. Jede Rechnung wird
 * einzeln als versendet oder fehlgeschlagen verbucht.
 */
export async function sendInvoiceMails<
  I extends { id: string; email: string | null },
>(params: {
  invoices: I[];
  compose: (invoice: I) => Promise<OfficeMail>;
  markSent: (invoice: I, mailedTo: string) => Promise<unknown>;
  markFailed: (invoice: I, reason: string) => Promise<unknown>;
  log: Logger;
}): Promise<SendSummary> {
  const sendable = params.invoices.filter(
    (invoice) => splitEmailList(invoice.email).length > 0,
  );
  const skippedCount = params.invoices.length - sendable.length;
  let sentCount = 0;
  let failedCount = 0;

  const BATCH_SIZE = 10;
  for (let i = 0; i < sendable.length; i += BATCH_SIZE) {
    const batch = sendable.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (invoice) => {
        const [to, ...cc] = splitEmailList(invoice.email);
        await sendMail(to!, cc, await params.compose(invoice));
        return [to!, ...cc].join(", ");
      }),
    );
    await Promise.all(
      results.map((result, index) => {
        const invoice = batch[index]!;
        if (result.status === "fulfilled") {
          sentCount++;
          return params.markSent(invoice, result.value);
        }
        failedCount++;
        const reason =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);
        params.log.error(
          `Failed to send invoice to ${maskEmail(invoice.email ?? undefined)}:`,
          reason,
        );
        return params.markFailed(invoice, reason.slice(0, 500));
      }),
    );
  }

  return { test: false, sentCount, failedCount, skippedCount };
}
