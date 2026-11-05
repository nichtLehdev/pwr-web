import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter } from "@/server/api/trpc";
import { permissionProcedure } from "../middleware/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "../helpers/audit";
import {
  effectiveMembershipRun,
  loadMembershipSettings,
  membershipInvoiceSummary,
  renderMembershipInvoice,
} from "../helpers/membership-billing";
import {
  CREATOR_SELECT,
  billingTextsInput,
  creatorName,
  defaultRunDates,
  normalizeEmailInput,
  parseWarnings,
  readUploadedSheet,
  sendInvoiceMails,
  sendTestMail,
  sheetUploadInput,
} from "../helpers/office-billing";
import {
  DEFAULT_MEMBERSHIP_CLOSING_TEXT,
  DEFAULT_MEMBERSHIP_EMAIL_BODY,
  DEFAULT_MEMBERSHIP_EMAIL_SUBJECT,
  DEFAULT_MEMBERSHIP_INTRO_TEXT,
  DEFAULT_MEMBERSHIP_SIGNATURE,
  MEMBERSHIP_RATE_FIELDS,
  MEMBERSHIP_RATE_KEYS,
  parseRunMembershipRates,
  parseSheetMembershipRates,
  serializeRunMembershipRates,
  sheetRunMembershipRates,
} from "@/lib/membership-billing";
import { fillPlaceholders, round2 } from "@/lib/office-billing";
import { parseMembershipSheet } from "@/server/utils/membership-sheet";
import { createLogger } from "@/server/utils/logger";
import {
  MembershipBillingRunStatus,
  type PrismaClient,
} from "~/generated/prisma/client";

const log = createLogger("Membership Billing");

const billingProcedure = permissionProcedure(PERMISSIONS.BILLING_MANAGE);

const rateValue = z.number().min(0).max(100_000).nullable();

async function requireDraft(db: PrismaClient, id: string) {
  const run = await db.membershipBillingRun.findUnique({ where: { id } });
  if (!run) throw new TRPCError({ code: "NOT_FOUND" });
  if (run.status !== MembershipBillingRunStatus.DRAFT) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Die Abrechnung ist schon ausgestellt.",
    });
  }
  return run;
}

function missingRatesMessage(keys: string[]): string {
  const labels = MEMBERSHIP_RATE_FIELDS.filter((field) =>
    keys.includes(field.key),
  ).map((field) => `„${field.label}“`);
  return `Für ${labels.join(", ")} ist kein Satz bekannt — die Tabelle hatte dafür keine lesbare Formel.`;
}

export const membershipBillingRouter = createTRPCRouter({
  getSettings: billingProcedure.query(async ({ ctx }) => {
    return {
      settings: await loadMembershipSettings(ctx.db),
      defaults: {
        introText: DEFAULT_MEMBERSHIP_INTRO_TEXT,
        closingText: DEFAULT_MEMBERSHIP_CLOSING_TEXT,
        signatureName: DEFAULT_MEMBERSHIP_SIGNATURE,
        emailSubject: DEFAULT_MEMBERSHIP_EMAIL_SUBJECT,
        emailBody: DEFAULT_MEMBERSHIP_EMAIL_BODY,
      },
    };
  }),

  updateSettings: billingProcedure
    .input(
      z.object({
        paymentReferencePrefix: z.string().trim().max(20),
        ...billingTextsInput,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.membershipBillingSettings.upsert({
        where: { id: 1 },
        update: input,
        create: { id: 1, ...input },
      });
      void logAudit(ctx.db, {
        actorId: ctx.session.user.id,
        actorEmail: ctx.session.user.email,
        action: "membership_billing.settings",
        entityType: "membership_billing_settings",
        details: { paymentReferencePrefix: input.paymentReferencePrefix },
      });
      return loadMembershipSettings(ctx.db);
    }),

  /**
   * Sätze eines Entwurfs ändern. Nur übergebene Sätze ändern sich; `null`
   * heißt wieder „wie in der Tabelle“.
   */
  setRunRates: billingProcedure
    .input(
      z.object({
        id: z.string(),
        baseFee: rateValue.optional(),
        rateWithIncome: rateValue.optional(),
        rateWithoutIncome: rateValue.optional(),
        magazinePrice: rateValue.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const run = await requireDraft(ctx.db, input.id);
      const sheet = parseSheetMembershipRates(run.sheetRates);
      const current = parseRunMembershipRates(run.rates);
      const changes: Partial<Record<string, number | null>> = {};
      for (const key of MEMBERSHIP_RATE_KEYS) {
        const change = input[key];
        if (change === undefined) continue;
        changes[key] = change;
        if (change === null) {
          current.values[key] = sheet[key];
          current.sources[key] = "sheet";
        } else {
          current.values[key] = change;
          current.sources[key] = "manual";
        }
      }
      await ctx.db.membershipBillingRun.update({
        where: { id: run.id },
        data: { rates: serializeRunMembershipRates(current) },
      });
      void logAudit(ctx.db, {
        actorId: ctx.session.user.id,
        actorEmail: ctx.session.user.email,
        action: "membership_billing.rates",
        entityType: "membership_billing_run",
        entityId: run.id,
        details: changes,
      });
      return { id: run.id };
    }),

  /** Liest die Mitgliedertabelle und legt daraus einen Entwurf an. */
  createRun: billingProcedure
    .input(sheetUploadInput)
    .mutation(async ({ ctx, input }) => {
      const sheet = await readUploadedSheet(
        input.fileBase64,
        parseMembershipSheet,
      );
      if (sheet.rows.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "In der Tabelle wurden keine Mitgliederzeilen gefunden.",
        });
      }

      const run = await ctx.db.membershipBillingRun.create({
        data: {
          ...defaultRunDates(),
          sourceFilename: input.filename,
          sheetRates: sheet.rates,
          rates: serializeRunMembershipRates(
            sheetRunMembershipRates(sheet.rates),
          ),
          createdById: ctx.session.user.id,
          invoices: {
            create: sheet.rows.map(({ markedRed, ...row }) => ({
              ...row,
              sheetMarkedRed: markedRed,
              // Wird beim Ausstellen fest gerechnet; bis dahin zählt die Vorschau.
              totalAmount: row.sheetTotal ?? 0,
              // Rot = keine Rechnung; ohne Gesamtbetrag (Unternummern, Vorstand,
              // Posaunenwarte …) ebenso. Beides zum Nachprüfen in „Nicht abrechnen“.
              excluded: markedRed || !row.sheetHasTotal,
            })),
          },
        },
        select: { id: true },
      });

      void logAudit(ctx.db, {
        actorId: ctx.session.user.id,
        actorEmail: ctx.session.user.email,
        action: "membership_billing.create_run",
        entityType: "membership_billing_run",
        entityId: run.id,
        details: { filename: input.filename, rows: sheet.rows.length },
      });

      return run;
    }),

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
      return ctx.db.membershipBillingRun.update({
        where: { id: input.id },
        data: {
          year: input.year,
          invoiceDate: input.invoiceDate,
          dueDate: input.dueDate,
        },
        select: { id: true },
      });
    }),

  /** Friert Sätze und Texte ein, rechnet die Beträge fest und gibt den Versand frei. */
  issueRun: billingProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const run = await requireDraft(ctx.db, input.id);
      const effective = await effectiveMembershipRun(ctx.db, run);
      if (effective.missingRates.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: missingRatesMessage(effective.missingRates),
        });
      }
      if (run.dueDate < run.invoiceDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Das Zahlungsziel liegt vor dem Rechnungsdatum.",
        });
      }
      const invoices = await ctx.db.membershipInvoice.findMany({
        where: { runId: run.id },
      });
      if (invoices.every((invoice) => invoice.excluded)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Es ist niemand zum Abrechnen ausgewählt.",
        });
      }

      await ctx.db.$transaction([
        ...invoices.map((invoice) =>
          ctx.db.membershipInvoice.update({
            where: { id: invoice.id },
            data: {
              totalAmount: membershipInvoiceSummary(effective, invoice).total,
            },
          }),
        ),
        // Bedingt auf DRAFT: zwei gleichzeitige Klicks stellen nur einmal aus.
        ctx.db.membershipBillingRun.updateMany({
          where: { id: run.id, status: MembershipBillingRunStatus.DRAFT },
          data: {
            status: MembershipBillingRunStatus.ISSUED,
            issuedAt: new Date(),
            paymentReferencePrefix: effective.paymentReferencePrefix,
            introText: effective.introText,
            closingText: effective.closingText,
            signatureName: effective.signatureName,
          },
        }),
      ]);

      void logAudit(ctx.db, {
        actorId: ctx.session.user.id,
        actorEmail: ctx.session.user.email,
        action: "membership_billing.issue_run",
        entityType: "membership_billing_run",
        entityId: run.id,
        details: {
          year: run.year,
          invoices: invoices.filter((invoice) => !invoice.excluded).length,
        },
      });

      return { id: run.id };
    }),

  listRuns: billingProcedure.query(async ({ ctx }) => {
    const runs = await ctx.db.membershipBillingRun.findMany({
      orderBy: { createdAt: "desc" },
      include: { createdBy: CREATOR_SELECT, invoices: true },
    });
    return Promise.all(
      runs.map(async ({ invoices, createdBy, ...run }) => {
        const effective = await effectiveMembershipRun(ctx.db, run);
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
          totalAmount: round2(
            billed.reduce(
              (sum, invoice) =>
                sum + membershipInvoiceSummary(effective, invoice).total,
              0,
            ),
          ),
        };
      }),
    );
  }),

  getRun: billingProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const run = await ctx.db.membershipBillingRun.findUnique({
        where: { id: input.id },
        include: {
          createdBy: CREATOR_SELECT,
          invoices: { orderBy: { sheetRow: "asc" } },
        },
      });
      if (!run) throw new TRPCError({ code: "NOT_FOUND" });
      const effective = await effectiveMembershipRun(ctx.db, run);
      const sheetRates = parseSheetMembershipRates(run.sheetRates);

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
        warnings: [] as string[],
        missingRates: effective.missingRates,
        missingRatesMessage:
          effective.missingRates.length > 0
            ? missingRatesMessage(effective.missingRates)
            : null,
        rates: MEMBERSHIP_RATE_FIELDS.map((field) => ({
          ...field,
          sheetValue: sheetRates[field.key],
          value: effective.missingRates.includes(field.key)
            ? null
            : effective.rates[field.key],
          source: effective.missingRates.includes(field.key)
            ? null
            : effective.sources[field.key],
        })),
        invoices: run.invoices.map((invoice) => {
          const summary = membershipInvoiceSummary(effective, invoice);
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
            sheetTotalFixed: invoice.sheetTotalFixed,
            sheetHasTotal: invoice.sheetHasTotal,
            sheetNote: invoice.sheetNote,
            warnings: parseWarnings(invoice.warnings),
            sheetMarkedRed: invoice.sheetMarkedRed,
            excluded: invoice.excluded,
            mailedAt: invoice.mailedAt,
            mailedTo: invoice.mailedTo,
            mailError: invoice.mailError,
            membersWithIncome: invoice.membersWithIncome,
            membersWithoutIncome: invoice.membersWithoutIncome,
            graduatedFeeFixed: invoice.graduatedFeeFixed,
            magazineCount: invoice.magazineCount,
            arrears: invoice.arrears,
            lines: summary.lines.map(({ key, amount }) => ({ key, amount })),
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
      const email = normalizeEmailInput(input.email);
      return ctx.db.membershipInvoice.update({
        where: { id: input.id },
        data: { ...(email !== undefined && { email }) },
        select: { id: true, email: true },
      });
    }),

  setExcluded: billingProcedure
    .input(
      z.object({
        runId: z.string(),
        invoiceIds: z.array(z.string()).min(1).max(10_000),
        excluded: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.membershipInvoice.updateMany({
        where: {
          runId: input.runId,
          id: { in: input.invoiceIds },
          mailedAt: null,
        },
        data: { excluded: input.excluded },
      });
      return { count };
    }),

  deleteRun: billingProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const mailed = await ctx.db.membershipInvoice.count({
        where: { runId: input.id, mailedAt: { not: null } },
      });
      if (mailed > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Aus diesem Lauf wurden schon Rechnungen verschickt; er bleibt als Nachweis erhalten.",
        });
      }
      await ctx.db.membershipBillingRun.delete({ where: { id: input.id } });
      void logAudit(ctx.db, {
        actorId: ctx.session.user.id,
        actorEmail: ctx.session.user.email,
        action: "membership_billing.delete_run",
        entityType: "membership_billing_run",
        entityId: input.id,
      });
      return { success: true };
    }),

  /**
   * Ohne `invoiceIds`: alle abzurechnenden, noch nicht verschickten Rechnungen
   * mit Adresse. Mit `testEmail` geht nur die erste dorthin; nichts wird verbucht.
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
      const run = await ctx.db.membershipBillingRun.findUnique({
        where: { id: input.runId },
      });
      if (!run) throw new TRPCError({ code: "NOT_FOUND" });
      if (
        run.status !== MembershipBillingRunStatus.ISSUED &&
        !input.testEmail
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Erst ausstellen, dann versenden.",
        });
      }
      const effective = await effectiveMembershipRun(ctx.db, run);
      const invoices = await ctx.db.membershipInvoice.findMany({
        where: {
          runId: run.id,
          excluded: false,
          ...(input.invoiceIds
            ? { id: { in: input.invoiceIds } }
            : { mailedAt: null }),
        },
        orderBy: { sheetRow: "asc" },
      });

      const settings = await loadMembershipSettings(ctx.db);
      const compose = async (invoice: (typeof invoices)[number]) => {
        const { placeholders } = membershipInvoiceSummary(effective, invoice);
        return {
          subject: fillPlaceholders(settings.emailSubject, placeholders),
          body: fillPlaceholders(settings.emailBody, placeholders),
          pdf: await renderMembershipInvoice(effective, invoice),
        };
      };

      if (input.testEmail) {
        return sendTestMail(invoices, input.testEmail, compose, log);
      }

      const summary = await sendInvoiceMails({
        invoices,
        compose,
        log,
        markSent: (invoice, mailedTo) =>
          ctx.db.membershipInvoice.update({
            where: { id: invoice.id },
            data: { mailedAt: new Date(), mailedTo, mailError: null },
          }),
        markFailed: (invoice, reason) =>
          ctx.db.membershipInvoice.update({
            where: { id: invoice.id },
            data: { mailError: reason },
          }),
      });

      void logAudit(ctx.db, {
        actorId: ctx.session.user.id,
        actorEmail: ctx.session.user.email,
        action: "membership_billing.send",
        entityType: "membership_billing_run",
        entityId: run.id,
        details: {
          sentCount: summary.sentCount,
          failedCount: summary.failedCount,
          skippedCount: summary.skippedCount,
        },
      });

      return summary;
    }),
});
