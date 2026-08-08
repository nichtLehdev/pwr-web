import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { readFile } from "fs/promises";
import { marked } from "marked";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  RegistrationStatus,
  type PrismaClient,
} from "~/generated/prisma/client";
import { userCanEditCourseRecord } from "../helpers/course-access";
import { userHasPermission } from "../helpers/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "../helpers/audit";
import { sanitizeHtml } from "@/lib/sanitize";
import { getBaseUrl } from "@/server/utils/get-base-url";
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

/** The values behind `{{…}}` for one recipient. Keys must be lowercase tokens. */
function placeholderValuesFor(
  recipient: Recipient,
  course: {
    title: string;
    startDate: Date;
    endDate: Date;
    location: { name: string | null; city: string } | null;
  },
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
    betrag: new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(recipient.totalPrice),
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
          email: recipient.email,
          name: `${recipient.firstName} ${recipient.lastName}`.trim(),
          registrationCount: recipient.registrationIds.length,
        })),
        count: recipients.length,
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
      const { sendCourseMailToRegistrant } = await import("@/server/email");

      const senderName = user.name?.trim() ?? "";
      const courseUrl = `${getBaseUrl(ctx.headers ? { headers: ctx.headers } : undefined)}/termine/course/${course.id}`;

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

      /** Same message, filled in for one specific recipient. */
      const personalize = (values: PlaceholderValues) => ({
        subject: applyPlaceholders(input.subject, values, {
          escapeHtml: false,
        }),
        // Substituting into the already-sanitized HTML, so values are escaped
        // here — a registrant named "<b>" must not become markup.
        bodyHtml: applyPlaceholders(bodyHtml, values, { escapeHtml: true }),
      });

      const recipients = await resolveRecipients(ctx.db, input.courseId, input);

      if (input.testEmail) {
        // Fill the test with a real recipient's data where possible, so the
        // organizer sees the actual substitution rather than empty gaps.
        const sample = recipients[0]
          ? placeholderValuesFor(recipients[0], course)
          : exampleValues();
        const personalized = personalize(sample);
        await sendCourseMailToRegistrant({
          ...baseMail,
          ...personalized,
          to: input.testEmail,
          subject: `[TEST] ${personalized.subject}`,
          recipientName: sample.vorname || senderName || undefined,
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

      // One message per recipient rather than a single BCC blast: it keeps
      // the greeting personal and avoids the spam scores a large BCC earns.
      // Bounded batches, since a sequential loop over hundreds of addresses
      // would outlive the request and Promise.all would flood the SMTP host.
      const BATCH_SIZE = 10;
      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((recipient) =>
            sendCourseMailToRegistrant({
              ...baseMail,
              ...personalize(placeholderValuesFor(recipient, course)),
              to: recipient.email,
              recipientName: recipient.firstName,
            }),
          ),
        );
        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            sentCount++;
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
            placeholderValuesFor(recipients[0]!, course),
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
        },
      });

      return {
        test: false,
        recipientCount: recipients.length,
        sentCount,
        failedCount,
      };
    }),
});
