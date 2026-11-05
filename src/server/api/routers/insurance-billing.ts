import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter } from "@/server/api/trpc";
import { permissionProcedure } from "../middleware/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "../helpers/audit";
import {
  effectiveInsuranceRun,
  insuranceInvoiceSummary,
  loadInsuranceSettings,
  parseSheetRates,
  renderInsuranceInvoice,
  resolveInsuranceRates,
} from "../helpers/insurance-billing";
import {
  DEFAULT_INSURANCE_CLOSING_TEXT,
  DEFAULT_INSURANCE_EMAIL_BODY,
  DEFAULT_INSURANCE_EMAIL_SUBJECT,
  DEFAULT_INSURANCE_INTRO_TEXT,
  DEFAULT_INSURANCE_SIGNATURE,
  fillInsurancePlaceholders,
  formatTaxRate,
  grossPremium,
  insuranceInvoiceLines,
  insuranceInvoiceTotal,
  splitEmailList,
} from "@/lib/insurance-billing";
import { berlinParts } from "@/lib/berlin-time";
import {
  InsuranceSheetError,
  parseInsuranceSheet,
  type ParsedInsuranceSheet,
} from "@/server/utils/insurance-sheet";
import { sendInsuranceInvoiceEmail } from "@/server/email";
import { maskEmail } from "@/lib/mask-email";
import { env } from "@/env";
import { createLogger } from "@/server/utils/logger";
import {
  InsuranceBillingRunStatus,
  type PrismaClient,
} from "~/generated/prisma/client";

const log = createLogger("Insurance Billing");

const billingProcedure = permissionProcedure(PERMISSIONS.BILLING_MANAGE);

/** Die Tabelle der Geschäftsstelle hat ~50 KB; alles darüber ist kein Versehen mehr. */
const MAX_SHEET_BYTES = 5 * 1024 * 1024;
const DEFAULT_REPLY_TO = "info@posaunenwerk-rheinland.de";
/** Vier Wochen Zahlungsziel, wie bisher grob von Januar bis Mitte Februar. */
const DEFAULT_DUE_DAYS = 28;
const DAY_MS = 24 * 60 * 60 * 1000;

const sheetInput = z.object({
  filename: z.string().trim().min(1).max(255),
  /** Inhalt der .xlsx als Base64. */
  fileBase64: z.string().min(1),
});

function decodeSheet(fileBase64: string): Buffer {
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
  return buffer;
}

async function readSheet(fileBase64: string): Promise<ParsedInsuranceSheet> {
  try {
    return await parseInsuranceSheet(decodeSheet(fileBase64));
  } catch (error) {
    if (error instanceof InsuranceSheetError) {
      throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    }
    throw error;
  }
}

async function requireDraft(db: PrismaClient, id: string) {
  const run = await db.insuranceBillingRun.findUnique({ where: { id } });
  if (!run) throw new TRPCError({ code: "NOT_FOUND" });
  if (run.status !== InsuranceBillingRunStatus.DRAFT) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Die Abrechnung ist schon ausgestellt.",
    });
  }
  return run;
}

function parseWarnings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function creatorName(
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

/** Leerer Text heißt "Standard" und wird als null gespeichert. */
const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform((value) => (value?.trim() ? value.trim() : null));

export const insuranceBillingRouter = createTRPCRouter({
  getSettings: billingProcedure.query(async ({ ctx }) => {
    const [settings, rates] = await Promise.all([
      loadInsuranceSettings(ctx.db),
      ctx.db.insurancePremiumRate.findMany({ orderBy: { maxValue: "asc" } }),
    ]);
    return {
      settings,
      rates: rates.map((rate) => ({
        maxValue: rate.maxValue,
        netPremium: rate.netPremium,
        updatedAt: rate.updatedAt,
      })),
      defaults: {
        introText: DEFAULT_INSURANCE_INTRO_TEXT,
        closingText: DEFAULT_INSURANCE_CLOSING_TEXT,
        signatureName: DEFAULT_INSURANCE_SIGNATURE,
        emailSubject: DEFAULT_INSURANCE_EMAIL_SUBJECT,
        emailBody: DEFAULT_INSURANCE_EMAIL_BODY,
      },
    };
  }),

  updateSettings: billingProcedure
    .input(
      z.object({
        taxRate: z.number().min(0).max(1),
        paymentReferencePrefix: z.string().trim().max(20),
        introText: optionalText(4000),
        closingText: optionalText(2000),
        signatureName: optionalText(200),
        emailSubject: optionalText(200),
        emailBody: optionalText(8000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insuranceBillingSettings.upsert({
        where: { id: 1 },
        update: input,
        create: { id: 1, ...input },
      });
      void logAudit(ctx.db, {
        actorId: ctx.session.user.id,
        actorEmail: ctx.session.user.email,
        action: "insurance_billing.settings",
        entityType: "insurance_billing_settings",
        details: {
          taxRate: input.taxRate,
          paymentReferencePrefix: input.paymentReferencePrefix,
        },
      });
      return loadInsuranceSettings(ctx.db);
    }),

  /** `netPremium: null` entfernt den hinterlegten Preis, dann gilt wieder die Tabelle. */
  setRates: billingProcedure
    .input(
      z.object({
        rates: z
          .array(
            z.object({
              maxValue: z.number().int().positive(),
              netPremium: z.number().min(0).max(100_000).nullable(),
            }),
          )
          .max(50),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction(
        input.rates.map((rate) =>
          rate.netPremium === null
            ? ctx.db.insurancePremiumRate.deleteMany({
                where: { maxValue: rate.maxValue },
              })
            : ctx.db.insurancePremiumRate.upsert({
                where: { maxValue: rate.maxValue },
                update: { netPremium: rate.netPremium },
                create: {
                  maxValue: rate.maxValue,
                  netPremium: rate.netPremium,
                },
              }),
        ),
      );
      void logAudit(ctx.db, {
        actorId: ctx.session.user.id,
        actorEmail: ctx.session.user.email,
        action: "insurance_billing.rates",
        entityType: "insurance_premium_rate",
        details: { rates: input.rates },
      });
      return ctx.db.insurancePremiumRate.findMany({
        orderBy: { maxValue: "asc" },
      });
    }),

  /**
   * Liest die Tabelle und legt daraus einen Entwurf an — wie eine Kursrechnung
   * zuerst als Entwurf entsteht. Vorschauen rechnen bis zum Ausstellen mit den
   * aktuellen Einstellungen.
   */
  createRun: billingProcedure
    .input(sheetInput)
    .mutation(async ({ ctx, input }) => {
      const sheet = await readSheet(input.fileBase64);
      if (sheet.rows.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "In der Tabelle wurden keine Chorzeilen gefunden.",
        });
      }

      const today = new Date();
      const { year: currentYear, month } = berlinParts(today);
      const sheetRates = sheet.categories.map((category) => ({
        maxValue: category.maxValue,
        netPremium: category.sheetNetPremium,
      }));
      const { rates } = await resolveInsuranceRates(ctx.db, sheetRates);
      const settings = await loadInsuranceSettings(ctx.db);

      const run = await ctx.db.insuranceBillingRun.create({
        data: {
          // Ab Oktober wird schon fürs nächste Jahr abgerechnet.
          year: currentYear + (month >= 10 ? 1 : 0),
          sourceFilename: input.filename,
          invoiceDate: today,
          dueDate: new Date(today.getTime() + DEFAULT_DUE_DAYS * DAY_MS),
          sheetRates,
          sheetTaxRate: sheet.sheetTaxRate,
          createdById: ctx.session.user.id,
          invoices: {
            create: sheet.rows.map((row) => ({
              sheetRow: row.sheetRow,
              choirNumber: row.choirNumber,
              choirName: row.choirName,
              recipientName1: row.recipientName1,
              recipientName2: row.recipientName2,
              recipientStreet: row.recipientStreet,
              recipientCity: row.recipientCity,
              email: row.email,
              quantities: row.quantities.map((entry) => ({ ...entry })),
              totalAmount: insuranceInvoiceTotal(
                insuranceInvoiceLines(rates, row.quantities, settings.taxRate),
              ),
              sheetTotal: row.sheetTotal,
              sheetNote: row.sheetNote,
              warnings: row.warnings,
              sheetMarkedRed: row.markedRed,
              // Rot markiert heißt "keine Rechnung"; ohne Instrumente ist der
              // Chor meist gekündigt. Beides landet zum Nachprüfen in der
              // Liste "Nicht abrechnen".
              excluded:
                row.markedRed ||
                row.quantities.every((entry) => entry.quantity === 0),
            })),
          },
        },
        select: { id: true },
      });

      void logAudit(ctx.db, {
        actorId: ctx.session.user.id,
        actorEmail: ctx.session.user.email,
        action: "insurance_billing.create_run",
        entityType: "insurance_billing_run",
        entityId: run.id,
        details: { filename: input.filename, invoices: sheet.rows.length },
      });

      return run;
    }),

  /** Jahr und Daten eines Entwurfs. */
  updateRun: billingProcedure
    .input(
      z.object({
        id: z.string(),
        year: z.number().int().min(2000).max(2100),
        invoiceDate: z.date(),
        dueDate: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireDraft(ctx.db, input.id);
      if (input.dueDate < input.invoiceDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Das Zahlungsziel liegt vor dem Rechnungsdatum.",
        });
      }
      return ctx.db.insuranceBillingRun.update({
        where: { id: input.id },
        data: {
          year: input.year,
          invoiceDate: input.invoiceDate,
          dueDate: input.dueDate,
        },
        select: { id: true },
      });
    }),

  /**
   * Friert Prämien, Steuersatz und Texte ein, rechnet die Beträge fest und gibt
   * den Versand frei. Wie bei Kursrechnungen ist das danach nicht mehr änderbar.
   */
  issueRun: billingProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const run = await requireDraft(ctx.db, input.id);
      const effective = await effectiveInsuranceRun(ctx.db, run);
      if (effective.missingRates.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Für die Wertklasse(n) ${effective.missingRates.map((v) => `bis ${v} €`).join(", ")} fehlt eine Prämie.`,
        });
      }
      if (run.dueDate < run.invoiceDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Das Zahlungsziel liegt vor dem Rechnungsdatum.",
        });
      }
      const invoices = await ctx.db.insuranceInvoice.findMany({
        where: { runId: run.id },
      });
      if (invoices.every((invoice) => invoice.excluded)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Es ist kein Chor zum Abrechnen ausgewählt.",
        });
      }

      await ctx.db.$transaction([
        ...invoices.map((invoice) =>
          ctx.db.insuranceInvoice.update({
            where: { id: invoice.id },
            data: {
              totalAmount: insuranceInvoiceSummary(effective, invoice).total,
            },
          }),
        ),
        // Bedingt auf DRAFT: zwei gleichzeitige Klicks stellen nur einmal aus.
        ctx.db.insuranceBillingRun.updateMany({
          where: { id: run.id, status: InsuranceBillingRunStatus.DRAFT },
          data: {
            status: InsuranceBillingRunStatus.ISSUED,
            issuedAt: new Date(),
            taxRate: effective.taxRate,
            paymentReferencePrefix: effective.paymentReferencePrefix,
            rates: effective.rates.map((rate) => ({ ...rate })),
            introText: effective.introText,
            closingText: effective.closingText,
            signatureName: effective.signatureName,
          },
        }),
      ]);

      void logAudit(ctx.db, {
        actorId: ctx.session.user.id,
        actorEmail: ctx.session.user.email,
        action: "insurance_billing.issue_run",
        entityType: "insurance_billing_run",
        entityId: run.id,
        details: {
          year: run.year,
          invoices: invoices.filter((invoice) => !invoice.excluded).length,
        },
      });

      return { id: run.id };
    }),

  listRuns: billingProcedure.query(async ({ ctx }) => {
    const runs = await ctx.db.insuranceBillingRun.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: { displayName: true, firstName: true, lastName: true },
        },
        invoices: {
          select: {
            excluded: true,
            mailedAt: true,
            mailError: true,
            quantities: true,
            choirNumber: true,
            choirName: true,
            recipientName1: true,
            recipientName2: true,
            recipientStreet: true,
            recipientCity: true,
          },
        },
      },
    });
    return Promise.all(
      runs.map(async ({ invoices, createdBy, ...run }) => {
        const effective = await effectiveInsuranceRun(ctx.db, run);
        const billed = invoices.filter((invoice) => !invoice.excluded);
        return {
          id: run.id,
          status: run.status,
          year: run.year,
          sourceFilename: run.sourceFilename,
          invoiceDate: run.invoiceDate,
          dueDate: run.dueDate,
          createdAt: run.createdAt,
          createdByName: creatorName(createdBy),
          invoiceCount: billed.length,
          mailedCount: billed.filter((invoice) => invoice.mailedAt).length,
          failedCount: billed.filter(
            (invoice) => !invoice.mailedAt && invoice.mailError,
          ).length,
          totalAmount:
            Math.round(
              billed.reduce(
                (sum, invoice) =>
                  sum + insuranceInvoiceSummary(effective, invoice).total,
                0,
              ) * 100,
            ) / 100,
        };
      }),
    );
  }),

  getRun: billingProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const run = await ctx.db.insuranceBillingRun.findUnique({
        where: { id: input.id },
        include: {
          createdBy: {
            select: { displayName: true, firstName: true, lastName: true },
          },
          invoices: { orderBy: { sheetRow: "asc" } },
        },
      });
      if (!run) throw new TRPCError({ code: "NOT_FOUND" });
      const effective = await effectiveInsuranceRun(ctx.db, run);
      const sheetRates = parseSheetRates(run.sheetRates);

      const warnings: string[] = [];
      if (
        effective.draft &&
        run.sheetTaxRate !== null &&
        Math.abs(run.sheetTaxRate - effective.taxRate) > 0.00001
      ) {
        warnings.push(
          `Die Tabelle rechnet mit ${formatTaxRate(run.sheetTaxRate)} Versicherungssteuer, eingestellt sind ${formatTaxRate(effective.taxRate)}. Die Rechnungen verwenden den eingestellten Satz.`,
        );
      }

      return {
        id: run.id,
        status: run.status,
        draft: effective.draft,
        issuedAt: run.issuedAt,
        year: run.year,
        sourceFilename: run.sourceFilename,
        invoiceDate: run.invoiceDate,
        dueDate: run.dueDate,
        createdAt: run.createdAt,
        createdByName: creatorName(run.createdBy),
        taxRate: effective.taxRate,
        missingRates: effective.missingRates,
        warnings,
        categories: sheetRates.map((sheet) => {
          const rate = effective.rates.find(
            (r) => r.maxValue === sheet.maxValue,
          );
          return {
            maxValue: sheet.maxValue,
            sheetNetPremium: sheet.netPremium,
            netPremium: rate?.netPremium ?? null,
            grossPremium: rate
              ? grossPremium(rate.netPremium, effective.taxRate)
              : null,
            source: rate?.source ?? null,
          };
        }),
        invoices: run.invoices.map((invoice) => {
          const summary = insuranceInvoiceSummary(effective, invoice);
          return {
            id: invoice.id,
            sheetRow: invoice.sheetRow,
            choirNumber: invoice.choirNumber,
            choirName: invoice.choirName,
            recipientName1: invoice.recipientName1,
            recipientName2: invoice.recipientName2,
            recipientStreet: invoice.recipientStreet,
            recipientCity: invoice.recipientCity,
            email: invoice.email,
            sheetTotal: invoice.sheetTotal,
            sheetNote: invoice.sheetNote,
            warnings: parseWarnings(invoice.warnings),
            sheetMarkedRed: invoice.sheetMarkedRed,
            excluded: invoice.excluded,
            mailedAt: invoice.mailedAt,
            mailedTo: invoice.mailedTo,
            mailError: invoice.mailError,
            quantities: summary.lines.map((line) => line.quantity),
            total: summary.total,
            paymentReference: summary.paymentReference,
          };
        }),
      };
    }),

  updateInvoice: billingProcedure
    .input(
      z.object({
        id: z.string(),
        email: z.string().trim().max(500).nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let email: string | null | undefined = undefined;
      if (input.email !== undefined) {
        const addresses = splitEmailList(input.email);
        if (input.email && addresses.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Keine gültige E-Mail-Adresse.",
          });
        }
        email = addresses.length > 0 ? addresses.join(", ") : null;
      }
      return ctx.db.insuranceInvoice.update({
        where: { id: input.id },
        data: { ...(email !== undefined && { email }) },
        select: { id: true, email: true },
      });
    }),

  /**
   * Abrechnen oder ausnehmen, für eine oder viele Rechnungen. Versendete bleiben
   * unangetastet — sie sind beim Empfänger.
   */
  setExcluded: billingProcedure
    .input(
      z.object({
        runId: z.string(),
        invoiceIds: z.array(z.string()).min(1).max(10_000),
        excluded: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.insuranceInvoice.updateMany({
        where: {
          runId: input.runId,
          id: { in: input.invoiceIds },
          mailedAt: null,
        },
        data: { excluded: input.excluded },
      });
      return { count };
    }),

  /** Nur solange nichts verschickt ist — danach ist der Lauf der Nachweis. */
  deleteRun: billingProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const mailed = await ctx.db.insuranceInvoice.count({
        where: { runId: input.id, mailedAt: { not: null } },
      });
      if (mailed > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Aus diesem Lauf wurden schon Rechnungen verschickt; er bleibt als Nachweis erhalten.",
        });
      }
      await ctx.db.insuranceBillingRun.delete({ where: { id: input.id } });
      void logAudit(ctx.db, {
        actorId: ctx.session.user.id,
        actorEmail: ctx.session.user.email,
        action: "insurance_billing.delete_run",
        entityType: "insurance_billing_run",
        entityId: input.id,
      });
      return { success: true };
    }),

  /**
   * Ohne `invoiceIds`: alle abzurechnenden, noch nicht verschickten Rechnungen
   * mit Adresse. Mit `testEmail` geht nur die erste Rechnung dorthin und nichts
   * wird verbucht — das geht auch beim Entwurf (dann mit "ENTWURF"-Stempel).
   */
  send: billingProcedure
    .input(
      z.object({
        runId: z.string(),
        invoiceIds: z.array(z.string()).max(10_000).optional(),
        testEmail: z.string().trim().email().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const run = await ctx.db.insuranceBillingRun.findUnique({
        where: { id: input.runId },
      });
      if (!run) throw new TRPCError({ code: "NOT_FOUND" });
      if (run.status !== InsuranceBillingRunStatus.ISSUED && !input.testEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Erst ausstellen, dann versenden.",
        });
      }
      const effective = await effectiveInsuranceRun(ctx.db, run);

      const invoices = await ctx.db.insuranceInvoice.findMany({
        where: {
          runId: run.id,
          excluded: false,
          ...(input.invoiceIds
            ? { id: { in: input.invoiceIds } }
            : { mailedAt: null }),
        },
        orderBy: { sheetRow: "asc" },
      });

      const settings = await loadInsuranceSettings(ctx.db);
      const replyTo = env.CONTACT_EMAIL ?? DEFAULT_REPLY_TO;

      const sendOne = async (
        invoice: (typeof invoices)[number],
        to: string,
        cc: string[],
        subjectPrefix = "",
      ) => {
        const { placeholders } = insuranceInvoiceSummary(effective, invoice);
        const pdf = await renderInsuranceInvoice(effective, invoice);
        await sendInsuranceInvoiceEmail({
          to,
          cc,
          replyTo,
          subject:
            subjectPrefix +
            fillInsurancePlaceholders(settings.emailSubject, placeholders),
          body: fillInsurancePlaceholders(settings.emailBody, placeholders),
          pdf: { filename: pdf.filename, content: Buffer.from(pdf.bytes) },
        });
      };

      if (input.testEmail) {
        const sample = invoices[0];
        if (!sample) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Keine Rechnung für den Testversand vorhanden.",
          });
        }
        try {
          await sendOne(sample, input.testEmail, [], "[TEST] ");
        } catch (error) {
          log.error("Test send failed:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Testversand fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
        return { test: true, sentCount: 1, failedCount: 0, skippedCount: 0 };
      }

      const sendable = invoices.filter(
        (invoice) => splitEmailList(invoice.email).length > 0,
      );
      const skippedCount = invoices.length - sendable.length;

      let sentCount = 0;
      let failedCount = 0;
      // Begrenzte Bündel wie beim Kursmailversand: nacheinander dauerte zu
      // lange, alle auf einmal überrollt den SMTP-Server.
      const BATCH_SIZE = 10;
      for (let i = 0; i < sendable.length; i += BATCH_SIZE) {
        const batch = sendable.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async (invoice) => {
            const [to, ...cc] = splitEmailList(invoice.email);
            await sendOne(invoice, to!, cc);
            return [to!, ...cc].join(", ");
          }),
        );
        await Promise.all(
          results.map((result, index) => {
            const invoice = batch[index]!;
            if (result.status === "fulfilled") {
              sentCount++;
              return ctx.db.insuranceInvoice.update({
                where: { id: invoice.id },
                data: {
                  mailedAt: new Date(),
                  mailedTo: result.value,
                  mailError: null,
                },
              });
            }
            failedCount++;
            const reason =
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason);
            log.error(
              `Failed to send insurance invoice to ${maskEmail(invoice.email ?? undefined)}:`,
              reason,
            );
            return ctx.db.insuranceInvoice.update({
              where: { id: invoice.id },
              data: { mailError: reason.slice(0, 500) },
            });
          }),
        );
      }

      void logAudit(ctx.db, {
        actorId: ctx.session.user.id,
        actorEmail: ctx.session.user.email,
        action: "insurance_billing.send",
        entityType: "insurance_billing_run",
        entityId: run.id,
        details: { sentCount, failedCount, skippedCount },
      });

      return { test: false, sentCount, failedCount, skippedCount };
    }),
});
