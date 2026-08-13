import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { readFile } from "fs/promises";
import { marked } from "marked";
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
import type { PermissionCache } from "../helpers/permissions";
import {
  applyPlaceholders,
  COURSE_MAIL_PLACEHOLDERS,
  findUnknownPlaceholders,
  joinNames,
  type PlaceholderValues,
} from "@/lib/course-mail-placeholders";

/**
 * Attachments live in the dedicated course-mail upload folder. Accepting any
 * /api/uploads path would let an organizer mail out a private download or
 * someone else's unapproved media by pasting its URL.
 */
const ATTACHMENT_PREFIX = "/api/uploads/course-mail/";

/**
 * Combined attachment budget for one message. Mail servers commonly reject
 * anything past ~25 MB, and base64 adds roughly a third on top — 10 MB of
 * payload stays comfortably inside that.
 */
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

type Recipient = {
  email: string;
  firstName: string;
  lastName: string;
  street: string | null;
  zipCode: string | null;
  city: string | null;
  registrationIds: string[];
  participantNames: string[];
  instruments: string[];
  totalPrice: number;
};

/** The published invoices addressed to one recipient, resolved on demand. */
type RecipientInvoice = {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  dueDate: Date | null;
  pdfPath: string;
  pdfFilename: string | null;
};

/**
 * Registrants addressed by a selection, collapsed to one entry per address.
 * A person who registered twice (e.g. two of their children) must not receive
 * the same information mail twice — their registrations are merged instead, so
 * {{teilnehmer}} names every child they signed up rather than just the first.
 */
async function resolveRecipients(
  db: PrismaClient,
  courseId: string,
  selection: { statuses: RegistrationStatus[]; registrationIds?: string[] },
): Promise<Recipient[]> {
  const useSelection = (selection.registrationIds?.length ?? 0) > 0;

  const registrations = await db.courseRegistration.findMany({
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

  const byEmail = new Map<string, Recipient>();
  for (const registration of registrations) {
    const email = registration.registrantEmail.trim();
    if (!email) continue;
    const key = email.toLowerCase();

    const recipient = byEmail.get(key) ?? {
      email,
      firstName: registration.registrantFirstName,
      lastName: registration.registrantLastName,
      street: registration.registrantStreet,
      zipCode: registration.registrantZipCode,
      city: registration.registrantCity,
      registrationIds: [],
      participantNames: [],
      instruments: [],
      totalPrice: 0,
    };

    recipient.registrationIds.push(registration.id);
    recipient.totalPrice += registration.totalPrice;
    for (const participant of registration.participants) {
      recipient.participantNames.push(
        `${participant.firstName} ${participant.lastName}`.trim(),
      );
      const instrument = participant.instrument?.trim();
      if (instrument && !recipient.instruments.includes(instrument)) {
        recipient.instruments.push(instrument);
      }
    }

    byEmail.set(key, recipient);
  }

  return [...byEmail.values()];
}

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

const formatAmount = (amount: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);

/**
 * The invoices currently in force for the given registrations, keyed by
 * registration id.
 *
 * Only PUBLISHED ones: a draft is not a document anybody may receive, and a
 * cancelled one must not be mailed out again as if it still applied.
 */
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
      pdfPath: invoice.pdfPath,
      pdfFilename: invoice.pdfFilename,
    });
    byRegistration.set(invoice.registrationId, list);
  }
  return byRegistration;
}

/**
 * Read one recipient's invoice PDFs off disk, ready to attach.
 *
 * `budgetBytes` is what is left of the message's attachment allowance after the
 * shared files. Anything past it is skipped and logged rather than thrown: the
 * blast is already under way by then, and a message that arrives with one
 * attachment missing beats one that never arrives at all.
 */
async function loadInvoiceAttachments(
  invoices: RecipientInvoice[],
  budgetBytes: number,
) {
  const attachments: { filename: string; content: Buffer }[] = [];
  let used = 0;

  for (const invoice of invoices) {
    const fsPath = resolveUploadFsPath(invoice.pdfPath);
    if (!fsPath) continue;
    try {
      const content = await readFile(/* turbopackIgnore: true */ fsPath);
      if (used + content.byteLength > budgetBytes) {
        console.error(
          `[CourseMail] Skipped invoice ${invoice.invoiceNumber}: attachment budget exhausted`,
        );
        continue;
      }
      used += content.byteLength;
      attachments.push({
        filename: safeAttachmentName(
          invoice.pdfFilename ?? `Rechnung_${invoice.invoiceNumber}.pdf`,
        ),
        content,
      });
    } catch (error) {
      // A missing file must not silently drop the whole mail — the message
      // still goes out, just without that attachment, and the log says why.
      console.error(
        `[CourseMail] Invoice PDF missing for ${invoice.invoiceNumber}:`,
        error,
      );
    }
  }
  return attachments;
}

/** The values behind `{{…}}` for one recipient. Keys must be lowercase tokens. */
function placeholderValuesFor(
  recipient: Recipient,
  course: {
    title: string;
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
    vorname: recipient.firstName,
    nachname: recipient.lastName,
    name: `${recipient.firstName} ${recipient.lastName}`.trim(),
    email: recipient.email,
    strasse: recipient.street ?? "",
    plz: recipient.zipCode ?? "",
    ort: recipient.city ?? "",
    adresse: address,
    teilnehmer: joinNames(recipient.participantNames),
    anzahl: String(recipient.participantNames.length),
    instrumente: joinNames(recipient.instruments),
    kurs: course.title,
    beginn: formatDate(course.startDate),
    ende: formatDate(course.endDate),
    kursort: courseLocation,
    betrag: formatAmount(recipient.totalPrice),
    // A person who registered twice gets both numbers, and the amount is the
    // sum — same collapsing rule as the rest of this record.
    rechnungsnummer: invoices
      .map((invoice) => invoice.invoiceNumber)
      .join(", "),
    rechnungsbetrag: invoices.length
      ? formatAmount(
          invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0),
        )
      : "",
    zahlungsziel: invoices
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
  const html = sanitizeHtml(String(await marked.parse(markdown)));
  if (!html.trim()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Die Nachricht darf nicht leer sein",
    });
  }
  return html;
}

/**
 * The same message, filled in for one specific recipient.
 *
 * Shared by `send` and `preview` — the preview is worthless if it substitutes
 * differently from the delivery.
 *
 * Substitution happens into the already-sanitized HTML, so values are escaped
 * here: a registrant named "<b>" must not become markup.
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
  /**
   * Whether the viewer may write to this course's registrants. The dashboard
   * asks the server instead of re-deriving the rule, so the button and the
   * mutation can't drift apart (the Bezirk case is invisible client-side).
   */
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

  /**
   * The finished message as one registrant would receive it — same rendering,
   * same substitution, same template as `send`, but nothing is sent.
   *
   * A mutation despite being read-only: queries travel as GET with the input
   * in the URL, and a whole mail body does not fit there.
   */
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

      // The recipient's own invoices, so {{rechnungsnummer}} and friends show
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

      const recipients = await resolveRecipients(ctx.db, input.courseId, input);

      const invoicesByRegistration = input.attachInvoices
        ? await loadPublishedInvoices(
            ctx.db,
            course.id,
            recipients.flatMap((recipient) => recipient.registrationIds),
          )
        : new Map<string, RecipientInvoice[]>();

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
        await sendCourseMailToRegistrant({
          ...baseMail,
          ...personalized,
          to: input.testEmail,
          subject: `[TEST] ${personalized.subject}`,
          recipientName: sample.vorname || senderName || undefined,
          attachments: sampleRecipient
            ? [
                ...attachments,
                ...(await loadInvoiceAttachments(
                  invoicesFor(sampleRecipient),
                  invoiceBudgetBytes,
                )),
              ]
            : attachments,
        });
        return { test: true, sentCount: 1, failedCount: 0, recipientCount: 1 };
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

      // One message per recipient rather than a single BCC blast: it keeps
      // the greeting personal and avoids the spam scores a large BCC earns.
      // Bounded batches, since a sequential loop over hundreds of addresses
      // would outlive the request and Promise.all would flood the SMTP host.
      const BATCH_SIZE = 10;
      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async (recipient) => {
            const recipientInvoices = invoicesFor(recipient);
            return sendCourseMailToRegistrant({
              ...baseMail,
              ...personalize(
                placeholderValuesFor(recipient, course, recipientInvoices),
              ),
              to: recipient.email,
              recipientName: recipient.firstName,
              attachments: [
                ...attachments,
                ...(await loadInvoiceAttachments(
                  recipientInvoices,
                  invoiceBudgetBytes,
                )),
              ],
            });
          }),
        );
        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            sentCount++;
            const recipient = batch[index];
            if (recipient) {
              for (const invoice of invoicesFor(recipient)) {
                mailedInvoiceIds.add(invoice.id);
              }
            }
          } else {
            failedCount++;
            console.error(
              `[CourseMail] Failed to send to ${batch[index]?.email}:`,
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
          console.error("[CourseMail] Failed to send sender copy:", error);
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
        },
      });

      return {
        test: false,
        recipientCount: recipients.length,
        sentCount,
        failedCount,
        invoicesAttached: mailedInvoiceIds.size,
      };
    }),
});
