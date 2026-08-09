import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  CourseCollaboratorRole,
  InvoiceStatus,
  type Prisma,
  type PrismaClient,
} from "~/generated/prisma/client";
import { PERMISSIONS } from "@/lib/permissions";
import {
  userHasPermission,
  type PermissionCache,
} from "../helpers/permissions";
import { permissionProcedure } from "../middleware/permissions";
import { logAudit } from "../helpers/audit";
import { createNotification } from "../helpers/notifications";
import { nextInvoiceId } from "../helpers/invoice-number";
import { buildInvoiceDraft, defaultDueDate } from "../helpers/invoice-draft";
import {
  storeInvoicePdf,
  type InvoiceRecordForPdf,
} from "../helpers/invoice-pdf";
import { invoiceTotal, type InvoiceLineItem } from "@/lib/invoice-document";

/**
 * Everything the PDF renderer needs, in one reusable include. Both storno
 * partners are pulled in so the correction notes can name the other document.
 */
const invoiceForPdfInclude = {
  course: {
    select: {
      id: true,
      title: true,
      startDate: true,
      endDate: true,
      createdById: true,
      bezirkId: true,
      invoicingEnabled: true,
      location: { select: { name: true, city: true } },
    },
  },
  replaces: { select: { id: true, invoiceNumber: true } },
  replacedBy: { select: { id: true, invoiceNumber: true } },
} satisfies Prisma.InvoiceInclude;

const lineItemInput = z.object({
  description: z.string().trim().min(1, "Bezeichnung fehlt").max(300),
  detail: z.string().trim().max(300).nullish(),
  // Bounded on both ends: a typo'd quantity must not silently produce a
  // five-figure invoice, and negative quantities belong in the price instead.
  quantity: z.number().min(0).max(1000),
  unitPrice: z.number().min(-1_000_000).max(1_000_000),
});

const recipientInput = {
  recipientCompany: z.string().trim().max(200).nullish(),
  recipientFirstName: z.string().trim().max(100).nullish(),
  recipientLastName: z.string().trim().max(100).nullish(),
  recipientStreet: z.string().trim().max(200).nullish(),
  recipientZipCode: z.string().trim().max(20).nullish(),
  recipientCity: z.string().trim().max(100).nullish(),
  recipientEmail: z
    .string()
    .trim()
    .email()
    .max(200)
    .nullish()
    .or(z.literal("")),
};

/** A drawn or uploaded signature image, kept out of the database on purpose. */
const signatureInput = z
  .string()
  .startsWith("data:image/")
  .max(2_000_000)
  .optional();

type CourseAccessRecord = {
  id: string;
  createdById: string | null;
  invoicingEnabled: boolean;
};

export type InvoiceAccess = {
  /** May create, edit and publish invoices for this course. */
  canManage: boolean;
  /** Holds invoices.generate, i.e. may work on any course's invoices. */
  hasGlobalGrant: boolean;
};

/**
 * Who may invoice a course: its organizers (creator or ORGANIZER collaborator)
 * and holders of invoices.generate (LPW/Admin). Plain STAFF collaborators can
 * see participants but deliberately cannot issue money documents.
 *
 * `courses.enable_invoicing` is not accepted here — deciding *that* a course is
 * billed and *doing* the billing are separate jobs by design.
 */
async function resolveInvoiceAccess(
  db: PrismaClient,
  userId: string,
  course: CourseAccessRecord,
  permissionCache?: PermissionCache,
): Promise<InvoiceAccess> {
  const [hasGlobalGrant, collaborator] = await Promise.all([
    userHasPermission(userId, PERMISSIONS.INVOICES_GENERATE, permissionCache),
    db.courseCollaborator.findUnique({
      where: { courseId_userId: { courseId: course.id, userId } },
      select: { role: true },
    }),
  ]);

  const isOrganizer =
    course.createdById === userId ||
    collaborator?.role === CourseCollaboratorRole.ORGANIZER;

  return { canManage: hasGlobalGrant || isOrganizer, hasGlobalGrant };
}

/** Load a course and assert the viewer may issue invoices for it. */
async function loadCourseForInvoicing(
  db: PrismaClient,
  courseId: string,
  userId: string,
  permissionCache?: PermissionCache,
  options: { requireInvoicingEnabled?: boolean } = {},
) {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      startDate: true,
      createdById: true,
      invoicingEnabled: true,
      priceOptions: { select: { label: true, price: true } },
    },
  });

  if (!course) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Kurs nicht gefunden" });
  }

  const access = await resolveInvoiceAccess(
    db,
    userId,
    course,
    permissionCache,
  );
  if (!access.canManage) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Keine Berechtigung, für diesen Kurs Rechnungen zu erstellen",
    });
  }

  if (options.requireInvoicingEnabled && !course.invoicingEnabled) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Für diesen Kurs ist die Rechnungsstellung nicht freigeschaltet.",
    });
  }

  return { course, access };
}

/** Load an invoice with everything the renderer and the guards need. */
async function loadInvoiceForWrite(
  db: PrismaClient,
  invoiceId: string,
  userId: string,
  permissionCache?: PermissionCache,
) {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: invoiceForPdfInclude,
  });

  if (!invoice) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Rechnung nicht gefunden",
    });
  }

  const access = await resolveInvoiceAccess(
    db,
    userId,
    invoice.course,
    permissionCache,
  );
  if (!access.canManage) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Keine Berechtigung für diese Rechnung",
    });
  }

  return { invoice, access };
}

/**
 * Load an invoice for reading. Anyone who may work on it, plus holders of
 * invoices.view — the archive links straight to this page, so a bookkeeper who
 * can list an invoice must also be able to open it (read-only).
 */
async function loadInvoiceForRead(
  db: PrismaClient,
  invoiceId: string,
  userId: string,
  permissionCache?: PermissionCache,
) {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: invoiceForPdfInclude,
  });

  if (!invoice) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Rechnung nicht gefunden",
    });
  }

  const [access, canViewArchive] = await Promise.all([
    resolveInvoiceAccess(db, userId, invoice.course, permissionCache),
    userHasPermission(userId, PERMISSIONS.INVOICES_VIEW, permissionCache),
  ]);

  if (!access.canManage && !canViewArchive) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Keine Berechtigung für diese Rechnung",
    });
  }

  return { invoice, canManage: access.canManage };
}

function assertDraft(status: InvoiceStatus) {
  if (status !== InvoiceStatus.DRAFT) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Veröffentlichte Rechnungen können nicht mehr geändert werden. Bitte stornieren und neu ausstellen.",
    });
  }
}

/** Empty string from a cleared form field means "no value", not "". */
function normalizeOptional(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toLineItems(
  items: z.infer<typeof lineItemInput>[],
): InvoiceLineItem[] {
  return items.map((item) => ({
    description: item.description,
    detail: normalizeOptional(item.detail),
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  }));
}

/**
 * Line items go into a Json column. Prisma's InputJsonValue does not accept an
 * interface array directly (no index signature), so the shape is widened here
 * in one place instead of casting at every call site.
 */
function lineItemsAsJson(items: InvoiceLineItem[]): Prisma.InputJsonValue {
  return items as unknown as Prisma.InputJsonValue;
}

/**
 * Keep the denormalized invoice columns on the registration in step with its
 * newest published invoice. The participants list, its search and the payment
 * dialog all read those fields.
 */
async function syncRegistrationInvoiceFields(
  tx: Prisma.TransactionClient,
  registrationId: string,
) {
  const latest = await tx.invoice.findFirst({
    where: { registrationId, status: InvoiceStatus.PUBLISHED },
    orderBy: { publishedAt: "desc" },
    select: { invoiceNumber: true, invoiceDate: true },
  });

  await tx.courseRegistration.update({
    where: { id: registrationId },
    data: latest
      ? {
          invoiceGenerated: true,
          invoiceId: latest.invoiceNumber,
          invoiceDate: latest.invoiceDate,
        }
      : { invoiceGenerated: false, invoiceId: null, invoiceDate: null },
  });
}

export const invoicesRouter = createTRPCRouter({
  /**
   * Whether the viewer may issue invoices for this course. The dashboard asks
   * the server rather than re-deriving the rule, so button and mutation cannot
   * drift apart.
   */
  canManageCourseInvoices: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({
        where: { id: input.courseId },
        select: { id: true, createdById: true, invoicingEnabled: true },
      });
      if (!course) return { canManage: false, invoicingEnabled: false };

      const access = await resolveInvoiceAccess(
        ctx.db,
        ctx.session.user.id,
        course,
        ctx.permissionCache,
      );
      return {
        canManage: access.canManage,
        invoicingEnabled: course.invoicingEnabled,
      };
    }),

  /** Every invoice of one course, plus the registrations still without one. */
  listForCourse: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      await loadCourseForInvoicing(
        ctx.db,
        input.courseId,
        ctx.session.user.id,
        ctx.permissionCache,
      );

      const invoices = await ctx.db.invoice.findMany({
        where: { courseId: input.courseId },
        orderBy: [{ createdAt: "desc" }],
        include: {
          replaces: { select: { id: true, invoiceNumber: true } },
          replacedBy: { select: { id: true, invoiceNumber: true } },
          createdBy: { select: { id: true, displayName: true, email: true } },
          registration: {
            select: {
              id: true,
              registrantFirstName: true,
              registrantLastName: true,
              registrationStatus: true,
            },
          },
        },
      });

      return invoices;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { invoice, canManage } = await loadInvoiceForRead(
        ctx.db,
        input.id,
        ctx.session.user.id,
        ctx.permissionCache,
      );
      return { ...invoice, canManage };
    }),

  /**
   * Registrations of a course that could still be invoiced — the picker behind
   * "Rechnung erstellen". Cancelled registrations and ones that already have a
   * live invoice are filtered out.
   */
  invoiceableRegistrations: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      await loadCourseForInvoicing(
        ctx.db,
        input.courseId,
        ctx.session.user.id,
        ctx.permissionCache,
      );

      const registrations = await ctx.db.courseRegistration.findMany({
        where: {
          courseId: input.courseId,
          registrationStatus: { not: "CANCELLED" },
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          registrantFirstName: true,
          registrantLastName: true,
          registrantEmail: true,
          totalPrice: true,
          paymentStatus: true,
          paymentMethod: true,
          siblingDiscountStatus: true,
          participants: { select: { firstName: true, lastName: true } },
          invoices: {
            where: {
              status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.PUBLISHED] },
            },
            select: { id: true, status: true, invoiceNumber: true },
          },
        },
      });

      return registrations.map((registration) => ({
        ...registration,
        hasOpenInvoice: registration.invoices.length > 0,
      }));
    }),

  /** Create one draft from a registration, prefilled from its participants. */
  createDraft: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        registrationId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { course } = await loadCourseForInvoicing(
        ctx.db,
        input.courseId,
        ctx.session.user.id,
        ctx.permissionCache,
        { requireInvoicingEnabled: true },
      );

      const registration = await ctx.db.courseRegistration.findFirst({
        where: { id: input.registrationId, courseId: course.id },
        include: { participants: true },
      });
      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Anmeldung nicht gefunden",
        });
      }

      const seed = buildInvoiceDraft(registration, course);

      const invoice = await ctx.db.invoice.create({
        data: {
          courseId: course.id,
          registrationId: registration.id,
          status: InvoiceStatus.DRAFT,
          recipientCompany: seed.recipient.company ?? null,
          recipientFirstName: seed.recipient.firstName ?? null,
          recipientLastName: seed.recipient.lastName ?? null,
          recipientStreet: seed.recipient.street ?? null,
          recipientZipCode: seed.recipient.zipCode ?? null,
          recipientCity: seed.recipient.city ?? null,
          recipientEmail: seed.recipient.email ?? null,
          lineItems: lineItemsAsJson(seed.lineItems),
          totalAmount: seed.totalAmount,
          dueDate: seed.dueDate,
          createdById: ctx.session.user.id,
        },
      });

      return invoice;
    }),

  /**
   * Draft one invoice per selected registration. Registrations that already
   * have a draft or a published invoice are skipped rather than duplicated.
   */
  createDraftsBulk: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        registrationIds: z.array(z.string()).min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { course } = await loadCourseForInvoicing(
        ctx.db,
        input.courseId,
        ctx.session.user.id,
        ctx.permissionCache,
        { requireInvoicingEnabled: true },
      );

      const registrations = await ctx.db.courseRegistration.findMany({
        where: { id: { in: input.registrationIds }, courseId: course.id },
        include: {
          participants: true,
          invoices: {
            where: {
              status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.PUBLISHED] },
            },
            select: { id: true },
          },
        },
      });

      const pending = registrations.filter(
        (registration) => registration.invoices.length === 0,
      );

      const created = await ctx.db.$transaction(
        pending.map((registration) => {
          const seed = buildInvoiceDraft(registration, course);
          return ctx.db.invoice.create({
            data: {
              courseId: course.id,
              registrationId: registration.id,
              status: InvoiceStatus.DRAFT,
              recipientCompany: seed.recipient.company ?? null,
              recipientFirstName: seed.recipient.firstName ?? null,
              recipientLastName: seed.recipient.lastName ?? null,
              recipientStreet: seed.recipient.street ?? null,
              recipientZipCode: seed.recipient.zipCode ?? null,
              recipientCity: seed.recipient.city ?? null,
              recipientEmail: seed.recipient.email ?? null,
              lineItems: lineItemsAsJson(seed.lineItems),
              totalAmount: seed.totalAmount,
              dueDate: seed.dueDate,
              createdById: ctx.session.user.id,
            },
            select: { id: true },
          });
        }),
      );

      return {
        created: created.length,
        skipped: registrations.length - pending.length,
        missing: input.registrationIds.length - registrations.length,
      };
    }),

  /** Save an edited draft. Published invoices are rejected. */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        ...recipientInput,
        lineItems: z.array(lineItemInput).min(1).max(200),
        dueDate: z.date().nullish(),
        introText: z.string().trim().max(2000).nullish(),
        closingText: z.string().trim().max(2000).nullish(),
        signatureName: z.string().trim().max(120).nullish(),
        internalNote: z.string().trim().max(2000).nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { invoice } = await loadInvoiceForWrite(
        ctx.db,
        input.id,
        ctx.session.user.id,
        ctx.permissionCache,
      );
      assertDraft(invoice.status);

      const lineItems = toLineItems(input.lineItems);

      return ctx.db.invoice.update({
        where: { id: invoice.id },
        data: {
          recipientCompany: normalizeOptional(input.recipientCompany),
          recipientFirstName: normalizeOptional(input.recipientFirstName),
          recipientLastName: normalizeOptional(input.recipientLastName),
          recipientStreet: normalizeOptional(input.recipientStreet),
          recipientZipCode: normalizeOptional(input.recipientZipCode),
          recipientCity: normalizeOptional(input.recipientCity),
          recipientEmail: normalizeOptional(input.recipientEmail),
          lineItems: lineItemsAsJson(lineItems),
          totalAmount: invoiceTotal(lineItems),
          dueDate: input.dueDate ?? null,
          introText: normalizeOptional(input.introText),
          closingText: normalizeOptional(input.closingText),
          signatureName: normalizeOptional(input.signatureName),
          internalNote: normalizeOptional(input.internalNote),
        },
      });
    }),

  /**
   * Issue the invoice: assign the next continuous number, freeze the PDF on
   * disk and tell the registrant.
   *
   * The number is drawn inside the transaction that flips the status, so a
   * failure rolls the counter back with it and the sequence stays unbroken
   * (§14 UStG). Rendering happens after the number exists but before the row
   * is marked published — a failed render therefore leaves a draft behind,
   * never a published invoice without a document.
   */
  publish: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        signatureBase64: signatureInput,
        /** Skip the in-app notification, e.g. when mailing the PDF instead. */
        notifyRegistrant: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { invoice } = await loadInvoiceForWrite(
        ctx.db,
        input.id,
        ctx.session.user.id,
        ctx.permissionCache,
      );
      assertDraft(invoice.status);

      if (!invoice.course.invoicingEnabled) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Für diesen Kurs ist die Rechnungsstellung nicht freigeschaltet.",
        });
      }

      const lineItems = Array.isArray(invoice.lineItems)
        ? invoice.lineItems
        : [];
      if (lineItems.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Eine Rechnung ohne Positionen kann nicht ausgestellt werden.",
        });
      }
      if (!invoice.recipientLastName && !invoice.recipientCompany) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Bitte einen Rechnungsempfänger angeben.",
        });
      }

      const now = new Date();
      const invoiceNumber = await ctx.db.$transaction(async (tx) => {
        // Claim the draft first: the conditional update both takes the row lock
        // and rules out a second publisher, so two organizers pressing the
        // button at once cannot each draw a number and burn a gap into the
        // sequence. The loser waits here and then matches zero rows.
        const claimed = await tx.invoice.updateMany({
          where: { id: invoice.id, status: InvoiceStatus.DRAFT },
          data: {
            invoiceDate: now,
            dueDate: invoice.dueDate ?? defaultDueDate(now),
          },
        });
        if (claimed.count === 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Diese Rechnung wurde bereits ausgestellt.",
          });
        }

        const number = await nextInvoiceId(tx);
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { invoiceNumber: number },
        });
        return number;
      });

      const pdfSource: InvoiceRecordForPdf = {
        ...invoice,
        invoiceNumber,
        invoiceDate: now,
        dueDate: invoice.dueDate ?? defaultDueDate(now),
        status: InvoiceStatus.PUBLISHED,
      };
      const stored = await storeInvoicePdf(pdfSource, input.signatureBase64);

      const published = await ctx.db.$transaction(async (tx) => {
        const updated = await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: InvoiceStatus.PUBLISHED,
            publishedAt: now,
            publishedById: ctx.session.user.id,
            pdfPath: stored.path,
            pdfFilename: stored.filename,
          },
        });
        if (invoice.registrationId) {
          await syncRegistrationInvoiceFields(tx, invoice.registrationId);
        }
        return updated;
      });

      void logAudit(ctx.db, {
        actorId: ctx.session.user.id,
        actorEmail: ctx.session.user.email,
        action: "invoice.publish",
        entityType: "invoice",
        entityId: invoice.id,
        details: {
          invoiceNumber,
          courseId: invoice.courseId,
          registrationId: invoice.registrationId,
          totalAmount: invoice.totalAmount,
          replacesInvoiceNumber: invoice.replaces?.invoiceNumber ?? null,
        },
      });

      // Only registrants with an account can be notified in-app; guests get
      // their invoice by mail from the organizer instead.
      if (input.notifyRegistrant && invoice.registrationId) {
        const registration = await ctx.db.courseRegistration.findUnique({
          where: { id: invoice.registrationId },
          select: { registrantId: true },
        });
        if (registration?.registrantId) {
          await createNotification(ctx.db, registration.registrantId, {
            type: "invoice.published",
            title: `Rechnung ${invoiceNumber} für „${invoice.course.title}“`,
            body: "Deine Rechnung steht jetzt unter „Meine Anmeldungen“ zum Download bereit.",
            url: `/registrations/${invoice.registrationId}`,
          });
          // Return the row that carries notifiedAt, not the one from before it.
          return ctx.db.invoice.update({
            where: { id: invoice.id },
            data: { notifiedAt: new Date() },
          });
        }
      }

      return published;
    }),

  /**
   * Void a published invoice. The document itself is kept — cancelling an
   * invoice is not the same as making it disappear.
   */
  cancel: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().trim().min(1, "Bitte einen Grund angeben").max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { invoice } = await loadInvoiceForWrite(
        ctx.db,
        input.id,
        ctx.session.user.id,
        ctx.permissionCache,
      );

      if (invoice.status !== InvoiceStatus.PUBLISHED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nur ausgestellte Rechnungen können storniert werden.",
        });
      }

      const cancelled = await ctx.db.$transaction(async (tx) => {
        const updated = await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: InvoiceStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelReason: input.reason,
          },
        });
        if (invoice.registrationId) {
          await syncRegistrationInvoiceFields(tx, invoice.registrationId);
        }
        return updated;
      });

      void logAudit(ctx.db, {
        actorId: ctx.session.user.id,
        actorEmail: ctx.session.user.email,
        action: "invoice.cancel",
        entityType: "invoice",
        entityId: invoice.id,
        details: {
          invoiceNumber: invoice.invoiceNumber,
          courseId: invoice.courseId,
          reason: input.reason,
        },
      });

      return cancelled;
    }),

  /**
   * The correction path: storno the published invoice and hand back a fresh
   * draft that carries its content over and points at its predecessor.
   */
  cancelAndReplace: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().trim().min(1, "Bitte einen Grund angeben").max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { invoice } = await loadInvoiceForWrite(
        ctx.db,
        input.id,
        ctx.session.user.id,
        ctx.permissionCache,
      );

      if (invoice.status !== InvoiceStatus.PUBLISHED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nur ausgestellte Rechnungen können storniert werden.",
        });
      }
      if (invoice.replacedBy) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Diese Rechnung wurde bereits durch ${invoice.replacedBy.invoiceNumber ?? "eine neue Rechnung"} ersetzt.`,
        });
      }

      const successor = await ctx.db.$transaction(async (tx) => {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: InvoiceStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelReason: input.reason,
          },
        });

        const draft = await tx.invoice.create({
          data: {
            courseId: invoice.courseId,
            registrationId: invoice.registrationId,
            status: InvoiceStatus.DRAFT,
            recipientCompany: invoice.recipientCompany,
            recipientFirstName: invoice.recipientFirstName,
            recipientLastName: invoice.recipientLastName,
            recipientStreet: invoice.recipientStreet,
            recipientZipCode: invoice.recipientZipCode,
            recipientCity: invoice.recipientCity,
            recipientEmail: invoice.recipientEmail,
            lineItems: invoice.lineItems ?? [],
            totalAmount: invoice.totalAmount,
            dueDate: defaultDueDate(),
            introText: invoice.introText,
            closingText: invoice.closingText,
            signatureName: invoice.signatureName,
            internalNote: invoice.internalNote,
            replacesInvoiceId: invoice.id,
            createdById: ctx.session.user.id,
          },
        });

        if (invoice.registrationId) {
          await syncRegistrationInvoiceFields(tx, invoice.registrationId);
        }

        return draft;
      });

      void logAudit(ctx.db, {
        actorId: ctx.session.user.id,
        actorEmail: ctx.session.user.email,
        action: "invoice.cancel_and_replace",
        entityType: "invoice",
        entityId: invoice.id,
        details: {
          invoiceNumber: invoice.invoiceNumber,
          courseId: invoice.courseId,
          reason: input.reason,
          successorInvoiceId: successor.id,
        },
      });

      return successor;
    }),

  /** Drafts are working copies and may be thrown away; issued ones may not. */
  deleteDraft: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { invoice } = await loadInvoiceForWrite(
        ctx.db,
        input.id,
        ctx.session.user.id,
        ctx.permissionCache,
      );
      assertDraft(invoice.status);

      await ctx.db.invoice.delete({ where: { id: invoice.id } });
      return { deleted: true };
    }),

  /**
   * Organisation-wide archive. Separate from the course view: this is the list
   * the office works with, so it spans every course and keeps cancelled
   * documents visible.
   */
  list: permissionProcedure(PERMISSIONS.INVOICES_VIEW)
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(25),
        courseId: z.string().optional(),
        status: z.nativeEnum(InvoiceStatus).optional(),
        /** Calendar year of the invoice date. */
        year: z.number().int().min(2000).max(2200).optional(),
        search: z.string().trim().max(200).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const search = input.search;
      const where: Prisma.InvoiceWhereInput = {
        ...(input.courseId ? { courseId: input.courseId } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.year
          ? {
              invoiceDate: {
                gte: new Date(Date.UTC(input.year, 0, 1)),
                lt: new Date(Date.UTC(input.year + 1, 0, 1)),
              },
            }
          : {}),
        ...(search
          ? {
              OR: [
                { invoiceNumber: { contains: search, mode: "insensitive" } },
                {
                  recipientLastName: { contains: search, mode: "insensitive" },
                },
                {
                  recipientFirstName: { contains: search, mode: "insensitive" },
                },
                { recipientCompany: { contains: search, mode: "insensitive" } },
                { recipientEmail: { contains: search, mode: "insensitive" } },
                {
                  course: { title: { contains: search, mode: "insensitive" } },
                },
              ],
            }
          : {}),
      };

      const [invoices, total, totals] = await Promise.all([
        ctx.db.invoice.findMany({
          where,
          orderBy: [{ createdAt: "desc" }],
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          include: {
            course: { select: { id: true, title: true, startDate: true } },
            replaces: { select: { id: true, invoiceNumber: true } },
            replacedBy: { select: { id: true, invoiceNumber: true } },
            createdBy: { select: { id: true, displayName: true, email: true } },
            registration: { select: { id: true, paymentStatus: true } },
          },
        }),
        ctx.db.invoice.count({ where }),
        ctx.db.invoice.aggregate({
          where: { ...where, status: InvoiceStatus.PUBLISHED },
          _sum: { totalAmount: true },
        }),
      ]);

      return {
        invoices,
        total,
        pages: Math.ceil(total / input.limit),
        /** Sum of the invoices actually in force, for the header figure. */
        publishedTotal: totals._sum.totalAmount ?? 0,
      };
    }),

  /** Courses that have invoices, to populate the archive's course filter. */
  archiveCourses: permissionProcedure(PERMISSIONS.INVOICES_VIEW).query(
    async ({ ctx }) => {
      const grouped = await ctx.db.invoice.groupBy({
        by: ["courseId"],
        _count: { _all: true },
      });
      if (grouped.length === 0) return [];

      const courses = await ctx.db.course.findMany({
        where: { id: { in: grouped.map((row) => row.courseId) } },
        select: { id: true, title: true, startDate: true },
        orderBy: { startDate: "desc" },
      });

      const counts = new Map(
        grouped.map((row) => [row.courseId, row._count._all]),
      );
      return courses.map((course) => ({
        ...course,
        invoiceCount: counts.get(course.id) ?? 0,
      }));
    },
  ),

  /** The published invoices belonging to the signed-in user's registrations. */
  myInvoices: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.invoice.findMany({
      where: {
        status: InvoiceStatus.PUBLISHED,
        registration: {
          OR: [
            { registrantId: ctx.session.user.id },
            { registrantEmail: ctx.session.user.email },
          ],
        },
      },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        dueDate: true,
        totalAmount: true,
        pdfFilename: true,
        registrationId: true,
        course: { select: { id: true, title: true } },
      },
    });
  }),
});
