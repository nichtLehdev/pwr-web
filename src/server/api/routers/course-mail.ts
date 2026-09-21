import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { readFile } from "fs/promises";
import { marked } from "marked";
import { absolutizeHtmlLinks } from "@/lib/content-link";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  InvoiceStatus,
  RegistrationStatus,
  type PrismaClient,
} from "~/generated/prisma/client";
import { userCanEditCourseRecord } from "../helpers/course-access";
import { userHasPermission } from "../helpers/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "../helpers/audit";
import { sanitizeHtml } from "@/lib/sanitize";
import { getBaseUrl } from "@/server/utils/get-base-url";
import { coursePath } from "@/lib/slug";
import { resolveUploadFsPath } from "@/server/utils/uploads-dir";
import { rateLimit } from "@/server/utils/rate-limit";
import { maskEmail } from "@/lib/mask-email";
import { invoicePaymentReference } from "@/lib/invoice-document";
import type { PermissionCache } from "../helpers/permissions";
import {
  groupRecipients,
  invoiceBillingEmail,
  mailToAddress,
  type Recipient,
  type RegistrationForMail,
} from "../helpers/course-mail-recipients";
import {
  applyPlaceholders,
  COURSE_MAIL_PLACEHOLDERS,
  findUnknownPlaceholders,
  joinNames,
  type PlaceholderValues,
} from "@/lib/course-mail-placeholders";

import { createLogger } from "@/server/utils/logger";
import { formatBerlin } from "@/lib/berlin-time";

const log = createLogger("Course Mail");

/**
 * Only this folder: accepting any /api/uploads path would let an organizer mail out
 * a private download or someone else's unapproved media.
 */
const ATTACHMENT_PREFIX = "/api/uploads/course-mail/";

/** Per message. Mail servers often reject >25 MB and base64 adds ~1/3, so 10 MB stays safe. */
const MAX_TOTAL_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/** Sends per user per hour. Generous for real use, bounded for a stolen session. */
const SEND_RATE_LIMIT = { maxRequests: 20, windowMs: 60 * 60 * 1000 };

const attachmentInput = z.object({
  filename: z.string().min(1).max(200),
  url: z.string().startsWith(ATTACHMENT_PREFIX),
  size: z.number().int().nonnegative(),
});

const recipientSelectionInput = {
  statuses: z
    .array(z.nativeEnum(RegistrationStatus))
    .min(1)
    .default([RegistrationStatus.CONFIRMED]),
  /** When set, only these registrations are addressed and `statuses` is ignored. */
  registrationIds: z.array(z.string()).optional(),
};

/** The published invoices addressed to one recipient, resolved on demand. */
type RecipientInvoice = {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  dueDate: Date | null;
  /** Die Adresse auf dem Dokument; weicht sie ab, ist sie die Rechnungsadresse. */
  recipientEmail: string | null;
  pdfPath: string;
  pdfFilename: string | null;
};

async function loadRegistrationsForMailing(
  db: PrismaClient,
  courseId: string,
  selection: { statuses: RegistrationStatus[]; registrationIds?: string[] },
): Promise<RegistrationForMail[]> {
  const useSelection = (selection.registrationIds?.length ?? 0) > 0;

  return db.courseRegistration.findMany({
    where: {
      courseId,
      ...(useSelection
        ? { id: { in: selection.registrationIds } }
        : { registrationStatus: { in: selection.statuses } }),
    },
    select: {
      id: true,
      registrantEmail: true,
      registrantFirstName: true,
      registrantLastName: true,
      registrantStreet: true,
      registrantZipCode: true,
      registrantCity: true,
      totalPrice: true,
      participants: {
        select: { firstName: true, lastName: true, instrument: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

/** Ohne Rechnungen im Umschlag entscheidet allein die Adresse der anmeldenden Person. */
async function resolveRecipients(
  db: PrismaClient,
  courseId: string,
  selection: { statuses: RegistrationStatus[]; registrationIds?: string[] },
): Promise<Recipient[]> {
  return groupRecipients(
    await loadRegistrationsForMailing(db, courseId, selection),
  );
}

const formatDate = (date: Date) => formatBerlin(date, "datumZweistellig");

const formatAmount = (amount: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);

/** Only PUBLISHED invoices, keyed by registration id: drafts aren't sendable, cancelled ones no longer apply. */
async function loadPublishedInvoices(
  db: PrismaClient,
  courseId: string,
  registrationIds: string[],
): Promise<Map<string, RecipientInvoice[]>> {
  if (registrationIds.length === 0) return new Map();

  const invoices = await db.invoice.findMany({
    where: {
      courseId,
      registrationId: { in: registrationIds },
      status: InvoiceStatus.PUBLISHED,
      pdfPath: { not: null },
    },
    orderBy: { publishedAt: "asc" },
    select: {
      id: true,
      invoiceNumber: true,
      totalAmount: true,
      dueDate: true,
      recipientEmail: true,
      pdfPath: true,
      pdfFilename: true,
      registrationId: true,
    },
  });

  const byRegistration = new Map<string, RecipientInvoice[]>();
  for (const invoice of invoices) {
    if (!invoice.registrationId || !invoice.pdfPath || !invoice.invoiceNumber) {
      continue;
    }
    const list = byRegistration.get(invoice.registrationId) ?? [];
    list.push({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      dueDate: invoice.dueDate,
      recipientEmail: invoice.recipientEmail,
      pdfPath: invoice.pdfPath,
      pdfFilename: invoice.pdfFilename,
    });
    byRegistration.set(invoice.registrationId, list);
  }
  return byRegistration;
}

/**
 * Invoices past the remaining attachment budget are skipped, not thrown (the blast is under way),
 * and reported back so `mailedAt` only credits what was actually attached.
 */
type LoadedInvoiceAttachments = {
  attachments: { filename: string; content: Buffer }[];
  /** Rechnungen, die wirklich am Umschlag hängen — Grundlage für `mailedAt`. */
  attachedIds: string[];
  /** Nummern der Rechnungen, die nicht mitkonnten. */
  skipped: string[];
};

async function loadInvoiceAttachments(
  invoices: RecipientInvoice[],
  budgetBytes: number,
): Promise<LoadedInvoiceAttachments> {
  const attachments: { filename: string; content: Buffer }[] = [];
  const attachedIds: string[] = [];
  const skipped: string[] = [];
  let used = 0;

  for (const invoice of invoices) {
    const fsPath = resolveUploadFsPath(invoice.pdfPath);
    if (!fsPath) {
      log.error(
        `Skipped invoice ${invoice.invoiceNumber}: PDF path is not inside the uploads directory`,
      );
      skipped.push(invoice.invoiceNumber);
      continue;
    }
    try {
      const content = await readFile(/* turbopackIgnore: true */ fsPath);
      if (used + content.byteLength > budgetBytes) {
        log.error(
          `[CourseMail] Skipped invoice ${invoice.invoiceNumber}: attachment budget exhausted`,
        );
        skipped.push(invoice.invoiceNumber);
        continue;
      }
      used += content.byteLength;
      attachments.push({
        filename: safeAttachmentName(
          invoice.pdfFilename ?? `Rechnung_${invoice.invoiceNumber}.pdf`,
        ),
        content,
      });
      attachedIds.push(invoice.id);
    } catch (error) {
      // A missing file must not silently drop the whole mail — the message
      // still goes out, just without that attachment, and the log says why.
      log.error(
        `[CourseMail] Invoice PDF missing for ${invoice.invoiceNumber}:`,
        error,
      );
      skipped.push(invoice.invoiceNumber);
    }
  }
  return { attachments, attachedIds, skipped };
}

/** The values behind `{{…}}` for one recipient. Keys must be lowercase tokens. */
function placeholderValuesFor(
  recipient: Recipient,
  course: {
    title: string;
    courseNumber: string | null;
    startDate: Date;
    endDate: Date;
    location: { name: string | null; city: string } | null;
  },
  invoices: RecipientInvoice[] = [],
): PlaceholderValues {
  const address = [
    recipient.street,
    [recipient.zipCode, recipient.city].filter(Boolean).join(" "),
  ]
    .filter((part) => part && part.trim())
    .join(", ");

  const courseLocation = course.location
    ? [course.location.name, course.location.city].filter(Boolean).join(", ")
    : "";

  return {
    "anmelder.vorname": recipient.firstName,
    "anmelder.nachname": recipient.lastName,
    "anmelder.name": `${recipient.firstName} ${recipient.lastName}`.trim(),
    "anmelder.email": recipient.email,
    "anmelder.strasse": recipient.street ?? "",
    "anmelder.plz": recipient.zipCode ?? "",
    "anmelder.ort": recipient.city ?? "",
    "anmelder.anschrift": address,
    "teilnehmer.namen": joinNames(recipient.participantNames),
    "teilnehmer.anzahl": String(recipient.participantNames.length),
    "teilnehmer.instrumente": joinNames(recipient.instruments),
    "anmeldung.betrag": formatAmount(recipient.totalPrice),
    "kurs.titel": course.title,
    "kurs.beginn": formatDate(course.startDate),
    "kurs.ende": formatDate(course.endDate),
    "kurs.ort": courseLocation,
    // A person who registered twice gets both numbers, and the amount is the
    // sum — same collapsing rule as the rest of this record.
    "rechnung.nummer": invoices
      .map((invoice) => invoice.invoiceNumber)
      .join(", "),
    // Was auf dem PDF und im Zahlungs-QR steht — mit Kursnummer ist das mehr
    // als die reine Rechnungsnummer, siehe invoicePaymentReference.
    "rechnung.verwendungszweck": invoices
      .map((invoice) =>
        invoicePaymentReference(invoice.invoiceNumber, course.courseNumber),
      )
      .join(", "),
    "rechnung.betrag": invoices.length
      ? formatAmount(
          invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0),
        )
      : "",
    "rechnung.zahlungsziel": invoices
      .map((invoice) => (invoice.dueDate ? formatDate(invoice.dueDate) : ""))
      .filter(Boolean)
      .join(", "),
  };
}

/** Course plus the check that this user may write to its registrants. */
async function loadCourseForMailing(
  db: PrismaClient,
  courseId: string,
  userId: string,
  permissionCache?: PermissionCache,
) {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      slug: true,
      title: true,
      courseNumber: true,
      startDate: true,
      endDate: true,
      createdById: true,
      bezirkId: true,
      location: { select: { name: true, city: true } },
    },
  });

  if (!course) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Kurs nicht gefunden" });
  }

  const allowed =
    (await userCanEditCourseRecord(db, userId, course, permissionCache)) ||
    (await userHasPermission(
      userId,
      PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
      permissionCache,
    ));

  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Keine Berechtigung, die Anmelder:innen dieses Kurses anzuschreiben",
    });
  }

  return course;
}

/** Strip anything that would turn a filename into a path or header injection. */
function safeAttachmentName(filename: string): string {
  const cleaned = filename
    .replace(/[/\\]/g, "-")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
  return cleaned.slice(0, 200) || "anhang";
}

async function loadAttachments(
  attachments: { filename: string; url: string }[],
) {
  let total = 0;
  const loaded: { filename: string; content: Buffer }[] = [];

  for (const attachment of attachments) {
    if (!attachment.url.startsWith(ATTACHMENT_PREFIX)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Ungültiger Anhang",
      });
    }
    const fsPath = resolveUploadFsPath(attachment.url);
    if (!fsPath) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Ungültiger Anhang",
      });
    }

    let content: Buffer;
    try {
      content = await readFile(/* turbopackIgnore: true */ fsPath);
    } catch {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Anhang "${attachment.filename}" wurde nicht gefunden`,
      });
    }

    total += content.byteLength;
    if (total > MAX_TOTAL_ATTACHMENT_BYTES) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Die Anhänge sind zusammen zu groß (max. ${MAX_TOTAL_ATTACHMENT_BYTES / (1024 * 1024)} MB).`,
      });
    }

    loaded.push({
      filename: safeAttachmentName(attachment.filename),
      content,
    });
  }

  return loaded;
}

/** Stand-ins for a test send on a course that has no registrations yet. */
function exampleValues(): PlaceholderValues {
  return Object.fromEntries(
    COURSE_MAIL_PLACEHOLDERS.map((placeholder) => [
      placeholder.token,
      placeholder.example,
    ]),
  );
}

async function renderBody(markdown: string): Promise<string> {
  // Seiteneigene Verweise absolut setzen: Im Mailprogramm gibt es keine
  // Basisadresse, „/termine/event/…" zeigte dort ins Leere.
  const html = absolutizeHtmlLinks(
    sanitizeHtml(String(await marked.parse(markdown))),
    getBaseUrl(),
  );
  if (!html.trim()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Die Nachricht darf nicht leer sein",
    });
  }
  return html;
}

/**
 * Shared by `send` and `preview` so both substitute identically. Values are escaped because
 * they go into already-sanitized HTML.
 */
function personalizeMail(
  subject: string,
  bodyHtml: string,
  values: PlaceholderValues,
) {
  return {
    subject: applyPlaceholders(subject, values, { escapeHtml: false }),
    bodyHtml: applyPlaceholders(bodyHtml, values, { escapeHtml: true }),
  };
}

export const courseMailRouter = createTRPCRouter({
  /** Asked server-side so button and mutation can't drift apart (the Bezirk case is invisible client-side). */
  canSend: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        await loadCourseForMailing(
          ctx.db,
          input.courseId,
          ctx.session.user.id,
          ctx.permissionCache,
        );
        return true;
      } catch {
        return false;
      }
    }),

  /** Preview of who a mail would reach — also backs the "copy addresses" button. */
  getRecipients: protectedProcedure
    .input(z.object({ courseId: z.string(), ...recipientSelectionInput }))
    .query(async ({ ctx, input }) => {
      await loadCourseForMailing(
        ctx.db,
        input.courseId,
        ctx.session.user.id,
        ctx.permissionCache,
      );

      const recipients = await resolveRecipients(ctx.db, input.courseId, input);

      return {
        recipients: recipients.map((recipient) => ({
          /** Addresses one merged recipient — what `preview` expects. */
          id: recipient.registrationIds[0]!,
          email: recipient.email,
          name: `${recipient.firstName} ${recipient.lastName}`.trim(),
          registrationCount: recipient.registrationIds.length,
        })),
        count: recipients.length,
      };
    }),

  /** A mutation despite being read-only: a whole mail body doesn't fit into a GET query URL. */
  preview: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        subject: z.string().max(200),
        body: z.string(),
        replyToEmail: z.string().email(),
        includeGreeting: z.boolean().default(true),
        attachInvoices: z.boolean().default(false),
        /** Whose data to fill in; the first recipient when omitted. */
        registrationId: z.string().optional(),
        ...recipientSelectionInput,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const course = await loadCourseForMailing(
        ctx.db,
        input.courseId,
        user.id,
        ctx.permissionCache,
      );

      const recipients = await resolveRecipients(ctx.db, input.courseId, input);
      const recipient = input.registrationId
        ? recipients.find((candidate) =>
            candidate.registrationIds.includes(input.registrationId!),
          )
        : recipients[0];

      // The recipient's own invoices, so {{rechnung.nummer}} and friends show
      // what they would actually receive rather than blanks.
      const invoices =
        recipient && input.attachInvoices
          ? [
              ...(
                await loadPublishedInvoices(
                  ctx.db,
                  course.id,
                  recipient.registrationIds,
                )
              ).values(),
            ].flat()
          : [];

      // No registrations yet (or a stale selection): show the message with the
      // example values rather than a page full of empty gaps.
      const values = recipient
        ? placeholderValuesFor(recipient, course, invoices)
        : exampleValues();

      const bodyHtml = await renderBody(input.body);
      const personalized = personalizeMail(input.subject, bodyHtml, values);

      const senderName = user.name?.trim() ?? "";
      const { generateCourseMailHtml } =
        await import("@/server/email/templates/course-mail-html");

      // Mirrors what sendCourseMailToRegistrant() builds — keep the two in step.
      const html = generateCourseMailHtml({
        bodyHtml: personalized.bodyHtml,
        courseTitle: course.title,
        courseStartDate: course.startDate,
        courseEndDate: course.endDate,
        recipientName: recipient ? recipient.firstName : values.vorname,
        senderName: senderName || "Posaunenwerk Rheinland",
        replyToEmail: input.replyToEmail,
        courseUrl: `${getBaseUrl(ctx.headers ? { headers: ctx.headers } : undefined)}${coursePath(course)}`,
        includeGreeting: input.includeGreeting,
      });

      return {
        subject: personalized.subject,
        html,
        recipient: recipient
          ? {
              name: `${recipient.firstName} ${recipient.lastName}`.trim(),
              email: recipient.email,
              /** Gesetzt heißt: dorthin geht die Mail, `email` nur in Kopie. */
              billingEmail: invoiceBillingEmail(recipient.email, invoices),
            }
          : null,
        /** True when there was nobody to fill in and examples were used. */
        usesExampleData: !recipient,
        recipientCount: recipients.length,
        /** Invoice PDFs this person would get on top of the shared files. */
        invoiceAttachments: invoices.map(
          (invoice) =>
            invoice.pdfFilename ?? `Rechnung_${invoice.invoiceNumber}.pdf`,
        ),
        // Reported rather than refused: catching a typo is the point of a
        // preview. `send` still rejects them.
        unknownPlaceholders: [
          ...new Set([
            ...findUnknownPlaceholders(input.subject),
            ...findUnknownPlaceholders(input.body),
          ]),
        ],
      };
    }),

  listSent: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      await loadCourseForMailing(
        ctx.db,
        input.courseId,
        ctx.session.user.id,
        ctx.permissionCache,
      );

      return ctx.db.courseMail.findMany({
        where: { courseId: input.courseId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    }),

  send: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        subject: z.string().min(1).max(200),
        /** Markdown, as produced by the dashboard rich-text editor. */
        body: z.string().min(1),
        replyToEmail: z.string().email(),
        attachments: z.array(attachmentInput).max(10).default([]),
        /**
         * Attach each recipient's own published invoice(s) for this course.
         * Recipients without one still receive the message, just without a PDF.
         */
        attachInvoices: z.boolean().default(false),
        /** Send only to this address for a final read-through. */
        testEmail: z.string().email().optional(),
        sendCopyToSender: z.boolean().default(true),
        /** Prepend the automatic "Hallo {Vorname}," line. */
        includeGreeting: z.boolean().default(true),
        ...recipientSelectionInput,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const course = await loadCourseForMailing(
        ctx.db,
        input.courseId,
        user.id,
        ctx.permissionCache,
      );

      if (!rateLimit(`courseMail.send:${user.id}`, SEND_RATE_LIMIT).success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Zu viele Sendevorgänge. Bitte versuche es später erneut.",
        });
      }

      // Refuse a typo'd token rather than mailing a literal "{{teilnehmerX}}"
      // to the whole course.
      const unknown = [
        ...new Set([
          ...findUnknownPlaceholders(input.subject),
          ...findUnknownPlaceholders(input.body),
        ]),
      ];
      if (unknown.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unbekannte Platzhalter: ${unknown.map((token) => `{{${token}}}`).join(", ")}`,
        });
      }

      const bodyHtml = await renderBody(input.body);
      const attachments = await loadAttachments(input.attachments);
      /** What a recipient's own invoices may still add on top. */
      const invoiceBudgetBytes =
        MAX_TOTAL_ATTACHMENT_BYTES -
        attachments.reduce(
          (sum, attachment) => sum + attachment.content.byteLength,
          0,
        );
      const { sendCourseMailToRegistrant } = await import("@/server/email");

      const senderName = user.name?.trim() ?? "";
      const courseUrl = `${getBaseUrl(ctx.headers ? { headers: ctx.headers } : undefined)}${coursePath(course)}`;

      const baseMail = {
        courseTitle: course.title,
        courseStartDate: course.startDate,
        courseEndDate: course.endDate,
        senderName: senderName || "Posaunenwerk Rheinland",
        replyToEmail: input.replyToEmail,
        includeGreeting: input.includeGreeting,
        courseUrl,
        attachments,
      };

      const personalize = (values: PlaceholderValues) =>
        personalizeMail(input.subject, bodyHtml, values);

      const registrations = await loadRegistrationsForMailing(
        ctx.db,
        input.courseId,
        input,
      );

      const invoicesByRegistration = input.attachInvoices
        ? await loadPublishedInvoices(
            ctx.db,
            course.id,
            registrations.map((registration) => registration.id),
          )
        : new Map<string, RecipientInvoice[]>();

      // Die Rechnungsadresse gehört zum Umschlag: ohne sie lägen zwei Rechnungen
      // an verschiedene Zahlstellen in derselben Nachricht.
      const recipients = groupRecipients(registrations, (registration) =>
        invoiceBillingEmail(
          registration.registrantEmail,
          invoicesByRegistration.get(registration.id) ?? [],
        ),
      );

      /** Every published invoice belonging to this recipient's registrations. */
      const invoicesFor = (recipient: Recipient) =>
        recipient.registrationIds.flatMap(
          (registrationId) => invoicesByRegistration.get(registrationId) ?? [],
        );

      if (input.testEmail) {
        // Fill the test with a real recipient's data where possible, so the
        // organizer sees the actual substitution rather than empty gaps.
        const sampleRecipient = recipients[0];
        const sample = sampleRecipient
          ? placeholderValuesFor(
              sampleRecipient,
              course,
              invoicesFor(sampleRecipient),
            )
          : exampleValues();
        const personalized = personalize(sample);
        const sampleInvoices = sampleRecipient
          ? await loadInvoiceAttachments(
              invoicesFor(sampleRecipient),
              invoiceBudgetBytes,
            )
          : null;
        await sendCourseMailToRegistrant({
          ...baseMail,
          ...personalized,
          to: input.testEmail,
          subject: `[TEST] ${personalized.subject}`,
          recipientName: sample.vorname || senderName || undefined,
          attachments: sampleInvoices
            ? [...attachments, ...sampleInvoices.attachments]
            : attachments,
        });
        // Der Test verbucht nichts — er zeigt aber, was im Ernstfall fehlen
        // würde, und dafür ist er da.
        return {
          test: true,
          sentCount: 1,
          failedCount: 0,
          recipientCount: 1,
          skippedInvoices: sampleInvoices?.skipped ?? [],
        };
      }

      if (recipients.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Für diese Auswahl gibt es keine Empfänger",
        });
      }

      let sentCount = 0;
      let failedCount = 0;
      /** Invoices actually attached to a delivered message, for `mailedAt`. */
      const mailedInvoiceIds = new Set<string>();
      /** Rechnungen, die an einer versendeten Nachricht gefehlt haben. */
      const skippedInvoices: string[] = [];

      // One message per recipient (personal greeting, no BCC spam score), in bounded batches:
      // sequential would outlive the request, Promise.all would flood the SMTP host.
      const BATCH_SIZE = 10;
      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async (recipient) => {
            const recipientInvoices = invoicesFor(recipient);
            const loaded = await loadInvoiceAttachments(
              recipientInvoices,
              invoiceBudgetBytes,
            );
            await sendCourseMailToRegistrant({
              ...baseMail,
              ...personalize(
                placeholderValuesFor(recipient, course, recipientInvoices),
              ),
              to: mailToAddress(recipient),
              // Die Rechnung geht an die Zahlstelle, die anmeldende Person liest mit.
              cc: recipient.billingEmail ? recipient.email : undefined,
              recipientName: recipient.firstName,
              attachments: [...attachments, ...loaded.attachments],
            });
            // Erst nach dem Versand zurückgegeben: was hier ankommt, hing an
            // einer Nachricht, die tatsächlich rausgegangen ist.
            return loaded;
          }),
        );
        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            sentCount++;
            for (const id of result.value.attachedIds) {
              mailedInvoiceIds.add(id);
            }
            skippedInvoices.push(...result.value.skipped);
          } else {
            failedCount++;
            const failed = batch[index];
            log.error(
              `[CourseMail] Failed to send to ${maskEmail(failed ? mailToAddress(failed) : undefined)}:`,
              result.reason,
            );
          }
        });
      }

      if (input.sendCopyToSender && user.email) {
        try {
          // Filled in for the first recipient, so the copy shows what was
          // actually delivered rather than raw placeholders.
          const copy = personalize(
            placeholderValuesFor(
              recipients[0]!,
              course,
              invoicesFor(recipients[0]!),
            ),
          );
          await sendCourseMailToRegistrant({
            ...baseMail,
            ...copy,
            to: user.email,
            subject: `[Kopie] ${copy.subject}`,
            recipientName: senderName || undefined,
          });
        } catch (error) {
          // The copy is a convenience — never fail a delivered blast over it.
          log.error("Failed to send sender copy:", error);
        }
      }

      const record = await ctx.db.courseMail.create({
        data: {
          courseId: course.id,
          senderId: user.id,
          senderName: senderName || user.email,
          senderEmail: user.email,
          replyToEmail: input.replyToEmail,
          subject: input.subject,
          body: input.body,
          recipientFilter: {
            statuses: input.registrationIds?.length ? [] : input.statuses,
            registrationIds: input.registrationIds ?? [],
          },
          attachments: input.attachments.length ? input.attachments : undefined,
          recipientCount: recipients.length,
          sentCount,
          failedCount,
        },
      });

      if (mailedInvoiceIds.size > 0) {
        await ctx.db.invoice.updateMany({
          where: { id: { in: [...mailedInvoiceIds] } },
          data: { mailedAt: new Date() },
        });
      }

      void logAudit(ctx.db, {
        actorId: user.id,
        actorEmail: user.email,
        action: "course.mail_registrants",
        entityType: "course",
        entityId: course.id,
        details: {
          courseMailId: record.id,
          subject: input.subject,
          recipientCount: recipients.length,
          sentCount,
          failedCount,
          attachmentCount: input.attachments.length,
          invoicesAttached: mailedInvoiceIds.size,
          invoicesSkipped: skippedInvoices,
        },
      });

      return {
        test: false,
        recipientCount: recipients.length,
        sentCount,
        failedCount,
        invoicesAttached: mailedInvoiceIds.size,
        /** Fehlende Rechnungen an versendeten Nachrichten; sonst hält die Absenderin sie für zugestellt. */
        skippedInvoices,
      };
    }),
});
