import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  rateLimitedPublicProcedure,
} from "../trpc";
import {
  CourseCollaboratorRole,
  CoursePaymentMethod,
  DownPaymentStatus,
  InvoiceStatus,
  RegistrationStatus,
  SiblingDiscountStatus,
} from "~/generated/prisma/client";
import type { Prisma } from "~/generated/prisma/client";
import type { db as database } from "@/server/db";
import { isExternalCourse } from "@/lib/course-external";
import { isRegistrationDeadlinePassed } from "@/lib/registration-deadline";
import { bookedAmountFor, invoiceOpenAmount } from "@/lib/invoice-payment";
import {
  downPaymentReceived,
  pinnedPaidAmountAfterChange,
  registrantEditViolation,
  registrantMayCancelDownPayment,
  registrationDownPayment,
} from "@/lib/course-down-payment";
import {
  downPaymentMailInfo,
  type DownPaymentMailInfo,
} from "@/server/email/down-payment";

function collaboratorsForViewer(userId: string | null) {
  return {
    // Magic-link callers have no account and can never be course staff, but
    // the include still needs a filter it can run — one that matches nothing.
    where: { userId: userId ?? "" },
    select: { role: true },
  } as const;
}

function viewerIsCourseTeamMember(
  collaborators: { role: CourseCollaboratorRole }[] | undefined,
) {
  return (collaborators?.length ?? 0) > 0;
}
import { userHasPermission } from "../helpers/permissions";
import { userCanBookInvoicePayments } from "../helpers/invoice-access";
import { userCanManageSiblingDiscount } from "../helpers/course-access";
import { PERMISSIONS } from "@/lib/permissions";
import {
  permissionProcedure,
  permissionProcedureAny,
} from "../middleware/permissions";
import { roundMoney } from "@/lib/sibling-discount";
import {
  otherPartParticipants,
  siblingDiscountParts,
  sumDiscountParts,
} from "../helpers/registration-group";
import {
  assertPriceTierCapacity,
  assertSeatSelectionFits,
  computeCourseCapacity,
  countConfirmedParticipants,
  findFullPriceTier,
  loadSeatAvailability,
  priceTierFullMessage,
  runSerializable,
} from "../helpers/course-capacity";
import {
  acceptPromotionOffer,
  assertMayAnswerPromotionOffer,
  declinePromotionOffer,
} from "../helpers/waitlist-offer";
import { randomUUID } from "node:crypto";
import { resolveParticipantPriceOption } from "@/lib/course-price-options";
import {
  normalizeSeatSelection,
  planRegistrationParts,
  siblingDiscountWithinGroup,
} from "@/lib/registration-split";
import { createRegistrationAccessToken } from "@/server/utils/registration-access-token";
import { logAudit } from "../helpers/audit";
import {
  createNotification,
  notifyUsersWithPermission,
} from "../helpers/notifications";
import {
  CLEARED_PROMOTION_OFFER,
  promoteFromWaitlist,
  sendPromotionEmails,
} from "../helpers/waitlist-promotion";
import {
  prepareParticipantsForCourse,
  resolveCoursePaymentMethod,
} from "../helpers/registration-write";
import {
  isRegistrationOwner,
  registrationAccessUrl,
  viewerId,
} from "../helpers/registration-access";
import { internationalPhoneSchema } from "@/lib/phone-number";

import { createLogger } from "@/server/utils/logger";

const log = createLogger("Registrations");

const getEmailService = async () => import("@/server/email");

type CreatedRegistration = {
  id: string;
  registrantEmail: string;
  registrantFirstName: string;
  registrantLastName: string;
  totalPrice: number;
  participants: unknown[];
  course: { title: string; startDate: Date; endDate: Date };
};

/**
 * Confirmation mail for a freshly created registration — the same message for
 * public sign-ups and for entries the course team records on someone's behalf.
 * Never throws: a failed mail must not undo a stored registration.
 */
async function sendRegistrationCreatedEmail(args: {
  registration: CreatedRegistration;
  registrationStatus: RegistrationStatus;
  siblingDiscountStatus: SiblingDiscountStatus;
  originalTotalPrice: number;
  siblingDiscountAmount: number;
  totalPrice: number;
  /** Überweisungsdaten der Anzahlung, sofern eine fällig ist. */
  downPayment: DownPaymentMailInfo | null;
}): Promise<void> {
  const {
    registration,
    registrationStatus,
    siblingDiscountStatus,
    originalTotalPrice,
    siblingDiscountAmount,
    totalPrice,
    downPayment,
  } = args;

  const emailService = await getEmailService();
  if (!emailService.isEmailConfigured()) return;

  try {
    if (
      siblingDiscountStatus === SiblingDiscountStatus.PENDING &&
      originalTotalPrice &&
      siblingDiscountAmount
    ) {
      await emailService.sendCourseRegistrationPendingDiscountEmail(
        registration.registrantEmail,
        registration.registrantFirstName,
        registration.registrantLastName,
        registration.course.title,
        registration.course.startDate,
        registration.course.endDate,
        originalTotalPrice,
        siblingDiscountAmount,
        totalPrice,
        registration.participants.length,
        registration.id,
        registrationAccessUrl(registration),
        downPayment,
      );
    } else if (registrationStatus === RegistrationStatus.CONFIRMED) {
      await emailService.sendCourseRegistrationConfirmedEmail(
        registration.registrantEmail,
        registration.registrantFirstName,
        registration.registrantLastName,
        registration.course.title,
        registration.course.startDate,
        registration.course.endDate,
        registration.totalPrice,
        registration.participants.length,
        registration.id,
        registrationAccessUrl(registration),
        downPayment,
      );
    } else if (registrationStatus === RegistrationStatus.WAITLIST) {
      await emailService.sendCourseRegistrationWaitlistEmail(
        registration.registrantEmail,
        registration.registrantFirstName,
        registration.registrantLastName,
        registration.course.title,
        registration.course.startDate,
        registration.course.endDate,
        registration.totalPrice,
        registration.participants.length,
        registration.id,
        registrationAccessUrl(registration),
        downPayment,
      );
    }
  } catch (error) {
    log.error("Failed to send registration email:", error);
  }
}

type CreatedRegistrationPart = Prisma.CourseRegistrationGetPayload<{
  include: {
    participants: true;
    course: { select: { title: true; startDate: true; endDate: true } };
  };
}>;

/** Die Anmeldung(en) eines Absendens: aufgeteilt bestätigt + wartend. */
type CreatedParts<T extends CreatedRegistrationPart = CreatedRegistrationPart> =
  {
    primary: { registration: T };
    waitlist: { registration: T } | null;
  };

/** Preis der gewählten Kategorie eines Teilnehmers. */
function priceOptionPrice(
  course: { priceOptions: Array<{ id: string; price: number }> },
  participant: { priceOptionId?: string | null },
): number {
  return (
    course.priceOptions.find(
      (option) => option.id === participant.priceOptionId,
    )?.price ?? 0
  );
}

/**
 * Die übermittelte Auswahl fürs Aufteilen, geprüft; `null` ohne Auswahl. Ob
 * tatsächlich aufgeteilt wird, entscheidet sich erst an den freien Plätzen.
 */
function parseSeatSelection(
  indexes: number[] | undefined,
  participantCount: number,
  course: { allowWaitingList: boolean | null },
): number[] | null {
  if (!indexes) return null;
  const selection = normalizeSeatSelection(indexes, participantCount);
  if (!selection) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Die Auswahl für die freien Plätze ist ungültig.",
    });
  }
  if (!course.allowWaitingList) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Dieser Kurs hat keine Warteliste – die Anmeldung lässt sich nicht aufteilen.",
    });
  }
  return selection;
}

/**
 * Mail zu einem Absenden. Aufgeteilt geht eine Mail für beide Teile hinaus —
 * zwei hätten nebeneinander „bestätigt“ und „Warteliste“ gemeldet.
 */
async function sendRegistrationPartsEmail(
  { primary, waitlist }: CreatedParts,
  course: Parameters<typeof downPaymentMailInfo>[1],
): Promise<void> {
  if (!waitlist) {
    const { registration } = primary;
    await sendRegistrationCreatedEmail({
      registration,
      registrationStatus: registration.registrationStatus,
      siblingDiscountStatus: registration.siblingDiscountStatus,
      originalTotalPrice:
        registration.originalTotalPrice ?? registration.totalPrice,
      siblingDiscountAmount: registration.siblingDiscountAmount ?? 0,
      totalPrice: registration.totalPrice,
      downPayment: downPaymentMailInfo(registration, course),
    });
    return;
  }

  const emailService = await getEmailService();
  if (!emailService.isEmailConfigured()) return;

  const mailPart = (registration: CreatedRegistrationPart) => ({
    registrationId: registration.id,
    participantNames: registration.participants.map(
      (participant) => `${participant.firstName} ${participant.lastName}`,
    ),
    totalPrice: registration.totalPrice,
    manageUrl: registrationAccessUrl(registration),
    downPayment: downPaymentMailInfo(registration, course),
  });

  try {
    await emailService.sendCourseRegistrationSplitEmail({
      email: primary.registration.registrantEmail,
      registrantFirstName: primary.registration.registrantFirstName,
      registrantLastName: primary.registration.registrantLastName,
      courseTitle: primary.registration.course.title,
      startDate: primary.registration.course.startDate,
      endDate: primary.registration.course.endDate,
      confirmed: mailPart(primary.registration),
      waitlist: mailPart(waitlist.registration),
      discountPending: [primary, waitlist].some(
        ({ registration }) =>
          registration.siblingDiscountStatus === SiblingDiscountStatus.PENDING,
      ),
    });
  } catch (error) {
    log.error("Failed to send split registration email:", error);
  }
}

/**
 * Antwort auf ein Absenden: die bestätigte (oder einzige) Anmeldung, dazu der
 * wartende Teil einer Aufteilung.
 */
function withWaitlistPart<T extends CreatedRegistrationPart>(
  parts: CreatedParts<T>,
) {
  return {
    ...parts.primary.registration,
    waitlistPart: parts.waitlist
      ? {
          id: parts.waitlist.registration.id,
          participantCount: parts.waitlist.registration.participants.length,
        }
      : null,
  };
}

/** In-app notification for the course team (creator + organizers). */
async function notifyCourseTeamOfNewRegistration(
  db: typeof database,
  args: {
    courseId: string;
    courseTitle: string;
    courseCreatedById: string | null;
    /** Excluded from the recipients — no one needs to be told about their own entry. */
    actorId: string | null;
    registration: CreatedRegistration;
    registrationStatus: RegistrationStatus;
    /** The waiting-list part when the registration was split. */
    waitlistRegistration?: CreatedRegistration;
    /** Marks entries the team recorded manually instead of public sign-ups. */
    byStaff?: boolean;
  },
): Promise<void> {
  try {
    const organizers = await db.courseCollaborator.findMany({
      where: {
        courseId: args.courseId,
        role: CourseCollaboratorRole.ORGANIZER,
      },
      select: { userId: true },
    });
    const recipients = new Set<string>(organizers.map((o) => o.userId));
    if (args.courseCreatedById) recipients.add(args.courseCreatedById);
    if (args.actorId) recipients.delete(args.actorId);

    const isWaitlisted =
      args.registrationStatus === RegistrationStatus.WAITLIST;
    const participantCount = args.registration.participants.length;
    const prefix = args.byStaff ? "Nachgetragene Anmeldung" : "Neue Anmeldung";
    const registrant = `${args.registration.registrantFirstName} ${args.registration.registrantLastName}`;
    for (const userId of recipients) {
      await createNotification(db, userId, {
        type: "registration.new",
        title: args.waitlistRegistration
          ? `${prefix} (teilweise Warteliste): ${args.courseTitle}`
          : isWaitlisted
            ? `${prefix} (Warteliste): ${args.courseTitle}`
            : `${prefix}: ${args.courseTitle}`,
        body: args.waitlistRegistration
          ? `${registrant} — ${participantCount} bestätigt, ${args.waitlistRegistration.participants.length} auf der Warteliste`
          : `${registrant} — ${participantCount} ${participantCount === 1 ? "Teilnehmer" : "Teilnehmer"}`,
        url: `/dashboard/courses/${args.courseId}/participants/${args.registration.id}`,
      });
    }
  } catch (error) {
    log.error("Failed to notify course team:", error);
  }
}

/** Übersetzt die Sortierspalte der Anmeldungsliste in eine Prisma-Sortierung. */
function registrationOrderBy(
  sortBy: "createdAt" | "registrant" | "course" | "totalPrice" | "status",
  sortOrder: "asc" | "desc",
): Prisma.CourseRegistrationOrderByWithRelationInput[] {
  switch (sortBy) {
    case "registrant":
      return [
        { registrantLastName: sortOrder },
        { registrantFirstName: sortOrder },
        { createdAt: "desc" },
      ];
    case "course":
      return [{ course: { title: sortOrder } }, { createdAt: "desc" }];
    case "totalPrice":
      return [{ totalPrice: sortOrder }, { createdAt: "desc" }];
    case "status":
      return [{ registrationStatus: sortOrder }, { createdAt: "desc" }];
    default:
      return [{ createdAt: sortOrder }];
  }
}

export const registrationsRouter = createTRPCRouter({
  create: rateLimitedPublicProcedure("registrations.create", {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000,
  })
    .input(
      z.object({
        courseId: z.string(),
        registrantFirstName: z.string().min(1).max(100),
        registrantLastName: z.string().min(1).max(100),
        registrantEmail: z.email(),
        registrantPhone: internationalPhoneSchema.optional(),
        registrantStreet: z.string().max(200).optional(),
        registrantZipCode: z.string().max(20).optional(),
        registrantCity: z.string().max(100).optional(),
        useSeparateBilling: z.boolean().optional(),
        billingCompany: z.string().max(200).optional(),
        billingFirstName: z.string().max(100).optional(),
        billingLastName: z.string().max(100).optional(),
        billingStreet: z.string().max(200).optional(),
        billingZipCode: z.string().max(20).optional(),
        billingCity: z.string().max(100).optional(),
        billingEmail: z.email().optional(),
        notes: z.string().max(2000).optional(),
        paymentMethod: z.nativeEnum(CoursePaymentMethod).optional(),
        siblingDiscountApplied: z.boolean().optional().default(false),
        /** Hinweise zur Anzahlung bestätigt — Pflicht, sobald eine fällig wird. */
        downPaymentAcknowledged: z.boolean().optional(),
        participants: z.array(
          z.object({
            firstName: z.string().min(1).max(100),
            lastName: z.string().min(1).max(100),
            birthDate: z.date().refine((date) => date < new Date(), {
              message: "Geburtsdatum muss in der Vergangenheit liegen",
            }),
            city: z.string().min(1).max(100),
            instrument: z.string().max(100).optional(),
            priceOptionId: z.string().min(1),
            customFields: z.record(z.string(), z.any()).optional(),
            siblingGroupId: z.string().optional(), // Groups siblings together for discount
          }),
        ),
        /**
         * Reichen die Plätze nicht für alle: die Teilnehmer (Index in
         * `participants`), die die freien Plätze bekommen. Die übrigen kommen
         * als eigene, verknüpfte Anmeldung auf die Warteliste. Ohne Angabe
         * wartet die ganze Anmeldung.
         */
        confirmedParticipantIndexes: z.array(z.number().int()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        participants: participantsInput,
        paymentMethod: inputPaymentMethod,
        downPaymentAcknowledged,
        confirmedParticipantIndexes,
        ...registrationData
      } = input;

      const course = await ctx.db.course.findUnique({
        where: { id: input.courseId },
        include: {
          priceOptions: true,
          customFields: true,
        },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      if (isExternalCourse(course)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Dieser Kurs wird über einen externen Anbieter angemeldet.",
        });
      }

      if (!course.registrationOpen) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Registration is closed for this course",
        });
      }

      if (
        course.registrationOpensAt &&
        new Date() < course.registrationOpensAt
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Registration is not yet open for this course",
        });
      }

      if (isRegistrationDeadlinePassed(course.registrationDeadline)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Registration deadline has passed",
        });
      }

      if (input.siblingDiscountApplied && !course.allowSiblingDiscount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Sibling discount is not available for this course",
        });
      }

      const { participants: participantsWithPriceOptions } =
        prepareParticipantsForCourse(participantsInput, course);

      // Die Anzahlung wird bei der Anmeldung festgehalten. Betrag, Bankdaten
      // und Erstattungshinweis muss die Anmeldung ausdrücklich bestätigen —
      // bei einer Aufteilung für beide Teile zugleich.
      const downPaymentAmount = registrationDownPayment(
        course,
        participantsWithPriceOptions,
      );
      if (downPaymentAmount && !downPaymentAcknowledged) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Bitte bestätige die Hinweise zur Anzahlung.",
        });
      }

      const seatSelection = parseSeatSelection(
        confirmedParticipantIndexes,
        participantsWithPriceOptions.length,
        course,
      );

      const resolvedPaymentMethod = resolveCoursePaymentMethod(
        course,
        inputPaymentMethod,
      );

      // Capacity check and insert run in one SERIALIZABLE transaction so two
      // concurrent registrations cannot both take the last seat. The sibling
      // discount is priced per part there, over all participants.
      const parts = await runSerializable(ctx.db, async (tx) => {
        const currentParticipantsCount = await countConfirmedParticipants(
          tx,
          input.courseId,
        );

        const newParticipants = participantsWithPriceOptions.length;
        const totalAfterRegistration =
          currentParticipantsCount + newParticipants;
        const maxParticipants = computeCourseCapacity(course);
        const availableSpots = maxParticipants - currentParticipantsCount;

        let status: RegistrationStatus = RegistrationStatus.CONFIRMED;

        if (totalAfterRegistration > maxParticipants) {
          if (!course.allowWaitingList) {
            if (availableSpots > 0 && availableSpots < newParticipants) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Nur noch ${availableSpots} ${availableSpots === 1 ? "Platz" : "Plätze"} verfügbar, aber Sie versuchen ${newParticipants} ${newParticipants === 1 ? "Teilnehmer" : "Teilnehmer"} anzumelden. Bitte reduzieren Sie die Anzahl der Teilnehmer oder kontaktieren Sie uns.`,
              });
            }
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Course is full and waiting list is not available",
            });
          }
          status = RegistrationStatus.WAITLIST;
        }

        // Auch die Preiskategorien haben ihre Grenzen. Eine ausgebuchte gilt
        // wie ein voller Kurs: mit Warteliste kommt die Anmeldung darauf,
        // ohne wird sie abgelehnt — sie scheiterte sonst trotz Warteliste.
        if (status === RegistrationStatus.CONFIRMED) {
          const additionsByOptionId: Record<string, number> = {};
          for (const participant of participantsWithPriceOptions) {
            additionsByOptionId[participant.priceOptionId] =
              (additionsByOptionId[participant.priceOptionId] ?? 0) + 1;
          }
          const fullOption = await findFullPriceTier(
            tx,
            input.courseId,
            course.priceOptions,
            additionsByOptionId,
          );
          if (fullOption) {
            if (!course.allowWaitingList) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: priceTierFullMessage(fullOption),
              });
            }
            status = RegistrationStatus.WAITLIST;
          }
        }

        // Aufgeteilt wird nur, wenn die Anmeldenden es gewählt haben und
        // nicht ohnehin alle Platz haben. Passt ihre Auswahl inzwischen
        // nicht mehr, entscheiden sie neu: still anders aufzuteilen hieße,
        // an ihrer Stelle zu bestimmen, wer mitfährt.
        const confirmedIndexes =
          status === RegistrationStatus.WAITLIST ? seatSelection : null;
        if (confirmedIndexes) {
          await assertSeatSelectionFits(tx, {
            course,
            participants: participantsWithPriceOptions,
            selection: confirmedIndexes,
            confirmedCount: currentParticipantsCount,
          });
        }

        const plan = planRegistrationParts(
          participantsWithPriceOptions,
          (participant) => priceOptionPrice(course, participant),
          {
            status,
            confirmedIndexes,
            withSiblingDiscount:
              input.siblingDiscountApplied && course.allowSiblingDiscount,
          },
        );
        const registrationGroupId = plan.waitlist ? randomUUID() : null;

        const createPart = async (part: typeof plan.primary) => {
          const partDownPayment = registrationDownPayment(
            course,
            part.participants,
          );
          const discounted = part.siblingDiscountAmount > 0;
          const registration = await tx.courseRegistration.create({
            data: {
              ...registrationData,
              ...(resolvedPaymentMethod != null
                ? { paymentMethod: resolvedPaymentMethod }
                : {}),
              totalPrice: part.totalPrice,
              downPaymentAmount: partDownPayment,
              downPaymentStatus: partDownPayment
                ? DownPaymentStatus.OPEN
                : null,
              originalTotalPrice: discounted ? part.originalTotalPrice : null,
              siblingDiscountAmount: discounted
                ? part.siblingDiscountAmount
                : null,
              siblingDiscountApplied: input.siblingDiscountApplied ?? false,
              siblingDiscountStatus: discounted
                ? SiblingDiscountStatus.PENDING
                : SiblingDiscountStatus.NONE,
              registrationStatus: part.status,
              registrationGroupId,
              participants: {
                create: part.participants.map((participant) => ({
                  ...participant,
                  // Führend für Kapazität und Belegung; `priceOption` bleibt
                  // als Anzeige-Snapshot daneben stehen.
                  priceOptionId: participant.priceOptionId,
                  customFields: (participant.customFields ||
                    {}) as Prisma.InputJsonValue,
                  siblingGroupId: participant.siblingGroupId || null,
                })),
              },
            },
            include: {
              participants: true,
              course: {
                select: {
                  title: true,
                  startDate: true,
                  endDate: true,
                },
              },
            },
          });
          return { registration, part };
        };

        return {
          primary: await createPart(plan.primary),
          waitlist: plan.waitlist ? await createPart(plan.waitlist) : null,
        };
      });

      await sendRegistrationPartsEmail(parts, course);

      await notifyCourseTeamOfNewRegistration(ctx.db, {
        courseId: input.courseId,
        courseTitle: course.title,
        courseCreatedById: course.createdById,
        actorId: ctx.session?.user.id ?? null,
        registration: parts.primary.registration,
        registrationStatus: parts.primary.part.status,
        waitlistRegistration: parts.waitlist?.registration,
      });

      return withWaitlistPart(parts);
    }),

  /**
   * Staff-side registration entry: lets the course team (creator, course
   * collaborators) and holders of courses.manage_registrations record an
   * anmeldung that never went through the public form — paper forms, phone
   * calls, late sign-ups after the deadline.
   *
   * Deliberately skips the public gates (registration open, opening date,
   * deadline). Everything else stays identical to the public flow: prices,
   * sibling discount, custom-field validation and seat capacity. Confirming
   * more participants than the course has seats needs an explicit
   * `allowOverbooking`, so a full course is never silently overbooked.
   */
  createByStaff: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        registrantFirstName: z.string().min(1).max(100),
        registrantLastName: z.string().min(1).max(100),
        registrantEmail: z.email(),
        registrantPhone: internationalPhoneSchema.optional(),
        registrantStreet: z.string().max(200).optional(),
        registrantZipCode: z.string().max(20).optional(),
        registrantCity: z.string().max(100).optional(),
        useSeparateBilling: z.boolean().optional(),
        billingCompany: z.string().max(200).optional(),
        billingFirstName: z.string().max(100).optional(),
        billingLastName: z.string().max(100).optional(),
        billingStreet: z.string().max(200).optional(),
        billingZipCode: z.string().max(20).optional(),
        billingCity: z.string().max(100).optional(),
        billingEmail: z.email().optional(),
        notes: z.string().max(2000).optional(),
        paymentMethod: z.nativeEnum(CoursePaymentMethod).optional(),
        siblingDiscountApplied: z.boolean().optional().default(false),
        participants: z
          .array(
            z.object({
              firstName: z.string().min(1).max(100),
              lastName: z.string().min(1).max(100),
              birthDate: z.date().refine((date) => date < new Date(), {
                message: "Geburtsdatum muss in der Vergangenheit liegen",
              }),
              city: z.string().min(1).max(100),
              instrument: z.string().max(100).optional(),
              priceOptionId: z.string().min(1),
              customFields: z.record(z.string(), z.any()).optional(),
              siblingGroupId: z.string().optional(),
            }),
          )
          .min(1),
        /** Omit to let capacity decide: confirmed while seats are free, else waiting list. */
        registrationStatus: z
          .enum([RegistrationStatus.CONFIRMED, RegistrationStatus.WAITLIST])
          .optional(),
        allowOverbooking: z.boolean().default(false),
        sendConfirmationEmail: z.boolean().default(true),
        /** Anzahlung lag der Anmeldung schon bei (z. B. Papierformular mit Überweisung). */
        downPaymentAlreadyPaid: z.boolean().default(false),
        /**
         * Wie bei `create`: die Teilnehmer, die die freien Plätze bekommen,
         * während die übrigen als verknüpfte Anmeldung warten. Nur ohne
         * ausdrücklichen Status.
         */
        confirmedParticipantIndexes: z.array(z.number().int()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        participants: participantsInput,
        paymentMethod: inputPaymentMethod,
        registrationStatus: requestedStatus,
        allowOverbooking,
        sendConfirmationEmail,
        downPaymentAlreadyPaid,
        confirmedParticipantIndexes,
        ...registrationData
      } = input;

      const course = await ctx.db.course.findUnique({
        where: { id: input.courseId },
        include: {
          priceOptions: true,
          customFields: true,
          collaborators: collaboratorsForViewer(viewerId(ctx)),
        },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      const isCreator = course.createdById === ctx.session.user.id;
      const teamMember = viewerIsCourseTeamMember(course.collaborators);
      const canManageRegistrations = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
        ctx.permissionCache,
      );

      if (!isCreator && !teamMember && !canManageRegistrations) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Keine Berechtigung, Anmeldungen für diesen Kurs zu erfassen.",
        });
      }

      if (isExternalCourse(course)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Dieser Kurs wird über einen externen Anbieter angemeldet.",
        });
      }

      if (input.siblingDiscountApplied && !course.allowSiblingDiscount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Sibling discount is not available for this course",
        });
      }

      // Die Altersgrenzen einer Kategorie gelten für Anmeldende; das Kursteam
      // darf sie im Einzelfall übergehen — es kennt die Ausnahme, die es
      // gerade einträgt.
      const { participants: participantsWithPriceOptions } =
        prepareParticipantsForCourse(participantsInput, course, {
          allowAgeMismatch: true,
        });

      // Aufgeteilt wird wie bei der öffentlichen Anmeldung — aber nur, wenn
      // das Team keinen Status ausdrücklich vorgibt.
      const seatSelection = requestedStatus
        ? null
        : parseSeatSelection(
            confirmedParticipantIndexes,
            participantsWithPriceOptions.length,
            course,
          );

      const resolvedPaymentMethod = resolveCoursePaymentMethod(
        course,
        inputPaymentMethod,
      );

      const parts = await runSerializable(ctx.db, async (tx) => {
        const confirmedCount = await countConfirmedParticipants(
          tx,
          input.courseId,
        );
        const capacity = computeCourseCapacity(course);
        const newParticipants = participantsWithPriceOptions.length;
        const fitsInCapacity = confirmedCount + newParticipants <= capacity;

        const additionsByOptionId: Record<string, number> = {};
        for (const participant of participantsWithPriceOptions) {
          additionsByOptionId[participant.priceOptionId] =
            (additionsByOptionId[participant.priceOptionId] ?? 0) + 1;
        }
        const fullOption = await findFullPriceTier(
          tx,
          input.courseId,
          course.priceOptions,
          additionsByOptionId,
        );

        // "Automatisch" behandelt eine ausgebuchte Preiskategorie wie einen
        // vollen Kurs, genau wie die öffentliche Anmeldung.
        const status: RegistrationStatus =
          requestedStatus ??
          ((fitsInCapacity && !fullOption) || !course.allowWaitingList
            ? RegistrationStatus.CONFIRMED
            : RegistrationStatus.WAITLIST);

        if (
          status === RegistrationStatus.CONFIRMED &&
          !fitsInCapacity &&
          !allowOverbooking
        ) {
          const availableSpots = Math.max(0, capacity - confirmedCount);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Der Kurs hat nur noch ${availableSpots} ${availableSpots === 1 ? "freien Platz" : "freie Plätze"}, die Anmeldung umfasst ${newParticipants} ${newParticipants === 1 ? "Teilnehmer" : "Teilnehmer"}. Auf die Warteliste setzen oder Überbuchung ausdrücklich zulassen.`,
          });
        }

        // The overbooking acknowledgement covers per-price-option caps too:
        // staff who knowingly exceed the course capacity should not be
        // stopped by a tier limit right afterwards.
        if (
          status === RegistrationStatus.CONFIRMED &&
          fullOption &&
          !allowOverbooking
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: priceTierFullMessage(fullOption),
          });
        }

        const confirmedIndexes =
          status === RegistrationStatus.WAITLIST ? seatSelection : null;
        if (confirmedIndexes) {
          await assertSeatSelectionFits(tx, {
            course,
            participants: participantsWithPriceOptions,
            selection: confirmedIndexes,
            confirmedCount,
          });
        }

        const plan = planRegistrationParts(
          participantsWithPriceOptions,
          (participant) => priceOptionPrice(course, participant),
          {
            status,
            confirmedIndexes,
            withSiblingDiscount:
              input.siblingDiscountApplied && course.allowSiblingDiscount,
          },
        );
        const registrationGroupId = plan.waitlist ? randomUUID() : null;

        const createPart = async (part: typeof plan.primary) => {
          const partDownPayment = registrationDownPayment(
            course,
            part.participants,
          );
          // Das Team bestätigt die Hinweise im Namen der Anmeldung (wie die
          // Teilnahmebedingungen) und kann eine schon eingegangene Anzahlung
          // gleich mit verbuchen — aufgeteilt beim bestätigten Teil, dem
          // einzigen, bei dem sie schon fällig ist.
          const downPaymentBooked =
            Boolean(partDownPayment) &&
            downPaymentAlreadyPaid &&
            (!plan.waitlist || part.status === RegistrationStatus.CONFIRMED);
          const discounted = part.siblingDiscountAmount > 0;
          const registration = await tx.courseRegistration.create({
            data: {
              ...registrationData,
              ...(resolvedPaymentMethod != null
                ? { paymentMethod: resolvedPaymentMethod }
                : {}),
              totalPrice: part.totalPrice,
              downPaymentAmount: partDownPayment,
              downPaymentStatus: partDownPayment
                ? downPaymentBooked
                  ? DownPaymentStatus.PAID
                  : DownPaymentStatus.OPEN
                : null,
              ...(downPaymentBooked && {
                downPaymentPaidAt: new Date(),
                downPaymentPaidById: ctx.session.user.id,
              }),
              originalTotalPrice: discounted ? part.originalTotalPrice : null,
              siblingDiscountAmount: discounted
                ? part.siblingDiscountAmount
                : null,
              siblingDiscountApplied: input.siblingDiscountApplied ?? false,
              siblingDiscountStatus: discounted
                ? SiblingDiscountStatus.PENDING
                : SiblingDiscountStatus.NONE,
              registrationStatus: part.status,
              registrationGroupId,
              participants: {
                create: part.participants.map((participant) => ({
                  ...participant,
                  priceOptionId: participant.priceOptionId,
                  customFields:
                    participant.customFields as Prisma.InputJsonValue,
                  siblingGroupId: participant.siblingGroupId || null,
                })),
              },
            },
            include: {
              participants: true,
              course: {
                select: {
                  title: true,
                  startDate: true,
                  endDate: true,
                },
              },
            },
          });
          return { registration, part };
        };

        return {
          primary: await createPart(plan.primary),
          waitlist: plan.waitlist ? await createPart(plan.waitlist) : null,
        };
      });

      const { registration } = parts.primary;

      if (sendConfirmationEmail) {
        await sendRegistrationPartsEmail(parts, course);
      }

      await notifyCourseTeamOfNewRegistration(ctx.db, {
        courseId: input.courseId,
        courseTitle: course.title,
        courseCreatedById: course.createdById,
        actorId: ctx.session.user.id,
        registration,
        registrationStatus: registration.registrationStatus,
        waitlistRegistration: parts.waitlist?.registration,
        byStaff: true,
      });

      void logAudit(ctx.db, {
        actorId: ctx.session.user.id,
        actorEmail: ctx.session.user.email,
        action: "registration.create_by_staff",
        entityType: "registration",
        entityId: registration.id,
        details: {
          courseId: input.courseId,
          registrantEmail: registration.registrantEmail,
          participantCount: registration.participants.length,
          registrationStatus: registration.registrationStatus,
          totalPrice: registration.totalPrice,
          ...(parts.waitlist && {
            waitlistRegistrationId: parts.waitlist.registration.id,
            waitlistParticipantCount:
              parts.waitlist.registration.participants.length,
          }),
          allowOverbooking,
          sendConfirmationEmail,
          afterDeadline: isRegistrationDeadlinePassed(
            course.registrationDeadline,
          ),
        },
      });

      return withWaitlistPart(parts);
    }),

  /**
   * "I signed up without an account and lost the link." Mails a fresh magic
   * link for every anmeldung on that address whose course has not ended yet.
   *
   * Always reports success: whether an address has registrations here is not
   * something an anonymous caller gets to probe for.
   */
  requestAccessLink: rateLimitedPublicProcedure(
    "registrations.requestAccessLink",
    { maxRequests: 5, windowMs: 60 * 60 * 1000 },
  )
    .input(z.object({ email: z.email() }))
    .mutation(async ({ ctx, input }) => {
      const registrations = await ctx.db.courseRegistration.findMany({
        where: {
          registrantEmail: { equals: input.email.trim(), mode: "insensitive" },
          registrationStatus: { not: RegistrationStatus.CANCELLED },
          course: { endDate: { gte: new Date() } },
        },
        include: {
          participants: { select: { id: true } },
          course: { select: { title: true, startDate: true, endDate: true } },
        },
        orderBy: { course: { startDate: "asc" } },
      });

      const first = registrations[0];
      if (!first) return { success: true };

      const emailService = await getEmailService();
      if (!emailService.isEmailConfigured()) return { success: true };

      try {
        // Delivered to the stored address, never to the one typed into the
        // form: the token is bound to what the registration actually holds.
        await emailService.sendRegistrationAccessLinksEmail(
          first.registrantEmail,
          first.registrantFirstName,
          registrations.map((registration) => ({
            courseTitle: registration.course.title,
            startDate: registration.course.startDate,
            endDate: registration.course.endDate,
            statusLabel:
              registration.registrationStatus === RegistrationStatus.WAITLIST
                ? "Auf Warteliste"
                : "Teilnahme bestätigt",
            participantsCount: registration.participants.length,
            manageUrl: registrationAccessUrl(registration),
          })),
        );
      } catch (error) {
        log.error("Failed to send registration access links:", error);
      }

      return { success: true };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string(), accessToken: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const registration = await ctx.db.courseRegistration.findUnique({
        where: { id: input.id },
        include: {
          participants: true,
          // Zahlungsstand wird an der Rechnung geführt — die Detailansicht
          // leitet ihn hieraus ab und bucht Zahlungen auch hier.
          invoices: {
            select: {
              id: true,
              status: true,
              invoiceNumber: true,
              invoiceDate: true,
              dueDate: true,
              totalAmount: true,
              paidAt: true,
              paidAmount: true,
              paymentNote: true,
            },
            orderBy: { createdAt: "asc" },
          },
          course: {
            select: {
              id: true,
              slug: true,
              title: true,
              isFree: true,
              startDate: true,
              endDate: true,
              registrationDeadline: true,
              registrationOpen: true,
              maxParticipants: true,
              allowWaitingList: true,
              allowSiblingDiscount: true,
              // Anzahlung: Kursnummer für den Verwendungszweck, Modus und
              // Beträge für die Bearbeitungsregeln, Hinweis zur Erstattung.
              courseNumber: true,
              downPaymentMode: true,
              downPaymentAmount: true,
              downPaymentRefundPolicy: true,
              downPaymentRefundText: true,
              createdById: true,
              collaborators: collaboratorsForViewer(viewerId(ctx)),
              priceOptions: {
                select: {
                  id: true,
                  label: true,
                  // description gehört zur Anzeige: bei zwei gleichnamigen
                  // Kategorien steht sie in Klammern hinter dem Namen.
                  description: true,
                  price: true,
                  maxParticipants: true,
                  downPaymentAmount: true,
                },
              },
              customFields: {
                orderBy: { sortOrder: "asc" },
              },
              location: {
                select: {
                  name: true,
                  city: true,
                },
              },
            },
          },
        },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registration not found",
        });
      }

      // A registration record contains the registrant's contact and billing
      // data plus participants' birth dates — only the registrant themselves
      // (signed in, or through a magic link) or course staff may read it.
      const isOwner = isRegistrationOwner(ctx, registration, input.accessToken);
      const userId = viewerId(ctx);
      const isCreator =
        userId !== null && registration.course.createdById === userId;
      const teamMember = viewerIsCourseTeamMember(
        registration.course.collaborators,
      );
      const canManageRegistrations =
        userId === null || isOwner || isCreator || teamMember
          ? false
          : await userHasPermission(
              userId,
              PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
              ctx.permissionCache,
            );

      // Über einen Geschwisterkindrabatt entscheidet, wer die Berechtigung
      // dafür hat — kursübergreifend. Dann muss er die Anmeldung auch lesen
      // dürfen, sonst führt die Freigabe-Warteschlange ins Leere. Ausgeweitet
      // wird dabei nichts: nur Anmeldungen, die einen Rabatt tragen.
      const canReviewSiblingDiscount =
        userId === null ||
        isOwner ||
        isCreator ||
        teamMember ||
        canManageRegistrations ||
        registration.siblingDiscountStatus === SiblingDiscountStatus.NONE
          ? false
          : await userHasPermission(
              userId,
              PERMISSIONS.REGISTRATIONS_MANAGE_SIBLING_DISCOUNT,
              ctx.permissionCache,
            );

      if (
        !isOwner &&
        !isCreator &&
        !teamMember &&
        !canManageRegistrations &&
        !canReviewSiblingDiscount
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registration not found",
        });
      }

      // Die übrigen Teile einer aufgeteilten Anmeldung. Sie gehören derselben
      // Anmeldung an, also sieht sie, wer diesen Teil sehen darf; wer über
      // einen Zugangslink kommt, bekommt die Links zu den anderen Teilen mit.
      const groupParts = registration.registrationGroupId
        ? await ctx.db.courseRegistration.findMany({
            where: {
              registrationGroupId: registration.registrationGroupId,
              id: { not: registration.id },
            },
            select: {
              id: true,
              registrationStatus: true,
              registrantEmail: true,
              participants: { select: { firstName: true, lastName: true } },
            },
            orderBy: { createdAt: "asc" },
          })
        : [];

      // Ein laufendes Nachrück-Angebot, mit den gerade nutzbaren Plätzen — die
      // Auswahl trifft die Detailseite.
      const promotionOffer =
        registration.registrationStatus === RegistrationStatus.WAITLIST &&
        registration.promotionOfferExpiresAt &&
        registration.promotionOfferExpiresAt > new Date()
          ? {
              expiresAt: registration.promotionOfferExpiresAt,
              availability: await loadSeatAvailability(
                ctx.db,
                registration.course,
              ),
            }
          : null;

      const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        course: { createdById, collaborators, ...course },
        ...rest
      } = registration;
      return {
        ...rest,
        course,
        promotionOffer,
        groupParts: groupParts.map(({ registrantEmail, ...part }) => ({
          ...part,
          accessToken:
            isOwner && input.accessToken
              ? createRegistrationAccessToken(part.id, registrantEmail)
              : null,
        })),
      };
    }),

  canManageRegistration: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const registration = await ctx.db.courseRegistration.findUnique({
        where: { id: input.id },
        include: {
          course: {
            select: {
              id: true,
              createdById: true,
              invoicingEnabled: true,
              startDate: true,
              registrationDeadline: true,
              collaborators: collaboratorsForViewer(viewerId(ctx)),
            },
          },
        },
      });
      if (!registration) {
        return {
          canView: false,
          canEdit: false,
          canCancel: false,
          isStaff: false,
          canBookPayments: false,
          canManageSiblingDiscount: false,
        };
      }
      const isOwner = registration.registrantEmail === ctx.session.user.email;
      const isCreator = registration.course.createdById === ctx.session.user.id;
      const canManageRegistrations = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
        ctx.permissionCache,
      );
      const collaboratorRows = registration.course.collaborators;
      const teamMember = viewerIsCourseTeamMember(collaboratorRows);
      const isStaff = teamMember || isCreator || canManageRegistrations;

      const canView = isOwner || isStaff;
      const now = new Date();
      const courseStart = new Date(registration.course.startDate);
      const isCancelled =
        registration.registrationStatus === RegistrationStatus.CANCELLED;
      const ownerCanEditByTime =
        courseStart > now &&
        !isRegistrationDeadlinePassed(
          registration.course.registrationDeadline,
          now,
        ) &&
        !isCancelled;
      const canEdit =
        canView &&
        (isCancelled ? false : isStaff ? true : isOwner && ownerCanEditByTime);
      // Mit Anzahlung storniert nur das Kursteam (siehe `cancel`).
      const canCancel =
        !isCancelled &&
        (isStaff || (isOwner && registrantMayCancelDownPayment(registration)));

      // Zahlungen folgen nicht der Anmeldungs-, sondern der Rechnungsregel —
      // deshalb dieselbe Funktion, die auch die Mutation durchsetzt, statt die
      // Rechte hier noch einmal von Hand nachzubauen.
      const canBookPayments = await userCanBookInvoicePayments(
        ctx.db,
        ctx.session.user.id,
        registration.course,
        ctx.permissionCache,
      );

      // Dieselbe Funktion, die auch die Mutation durchsetzt: die
      // Kursverantwortung ist clientseitig nicht sichtbar.
      const { allowed: canManageSiblingDiscount } =
        await userCanManageSiblingDiscount(
          ctx.db,
          ctx.session.user.id,
          registration.course,
          ctx.permissionCache,
        );

      return {
        canView,
        canEdit,
        canCancel,
        isStaff,
        canBookPayments,
        canManageSiblingDiscount,
      };
    }),

  /**
   * Cross-course registration overview for administrators: every
   * registration, filterable by registrant, status, payment, and course —
   * the "who owes money / who registered" view that per-course participant
   * pages can't answer.
   *
   * Zwei Zugänge: mit courses.manage_registrations die volle Liste, mit
   * registrations.manage_sibling_discount nur die nach Rabattstatus gefilterte.
   * Über genau diese Anmeldungen entscheidet die Rabattberechtigung ohnehin —
   * ohne den Zugang bliebe die Freigabe-Warteschlange für sie unauffindbar.
   */
  getAllAdmin: permissionProcedureAny([
    PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
    PERMISSIONS.REGISTRATIONS_MANAGE_SIBLING_DISCOUNT,
  ])
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(250).default(25),
        search: z.string().max(200).optional(),
        /* Set filters: an empty array means "no restriction". */
        registrationStatus: z
          .array(z.nativeEnum(RegistrationStatus))
          .optional(),
        /** Nur Anmeldungen mit noch offener bzw. beglichener Rechnung. */
        paid: z.boolean().optional(),
        siblingDiscountStatus: z
          .array(z.nativeEnum(SiblingDiscountStatus))
          .optional(),
        courseId: z.array(z.string()).optional(),
        sortBy: z
          .enum(["createdAt", "registrant", "course", "totalPrice", "status"])
          .default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Die Rabattberechtigung öffnet nur die Anmeldungen, über die sie
      // entscheidet: die mit einem Rabatt. NONE zählt ausdrücklich nicht dazu —
      // danach zu filtern wäre die ganze Tabelle minus einer Handvoll Zeilen.
      const discountStatuses = input.siblingDiscountStatus?.length
        ? input.siblingDiscountStatus
        : undefined;
      const scopedToSiblingDiscount =
        discountStatuses !== undefined &&
        discountStatuses.every(
          (status) => status !== SiblingDiscountStatus.NONE,
        );

      if (!scopedToSiblingDiscount) {
        const canSeeEveryRegistration = await userHasPermission(
          ctx.session.user.id,
          PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
          ctx.permissionCache,
        );
        if (!canSeeEveryRegistration) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Permission required: ${PERMISSIONS.COURSES_MANAGE_REGISTRATIONS}`,
          });
        }
      }

      const search = input.search?.trim();
      const statuses = input.registrationStatus?.length
        ? input.registrationStatus
        : undefined;
      const courseIds = input.courseId?.length ? input.courseId : undefined;

      const where: Prisma.CourseRegistrationWhereInput = {
        ...(statuses && { registrationStatus: { in: statuses } }),
        ...(discountStatuses && {
          siblingDiscountStatus: { in: discountStatuses },
        }),
        ...(input.paid === undefined
          ? {}
          : input.paid
            ? {
                invoices: {
                  some: {
                    status: InvoiceStatus.PUBLISHED,
                    paidAt: { not: null },
                  },
                },
              }
            : {
                invoices: {
                  some: { status: InvoiceStatus.PUBLISHED, paidAt: null },
                },
              }),
        ...(courseIds && { courseId: { in: courseIds } }),
        ...(search && {
          OR: [
            { registrantEmail: { contains: search, mode: "insensitive" } },
            { registrantFirstName: { contains: search, mode: "insensitive" } },
            { registrantLastName: { contains: search, mode: "insensitive" } },
            { invoiceId: { contains: search, mode: "insensitive" } },
            {
              participants: {
                some: {
                  OR: [
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        }),
      };

      const [registrations, total] = await Promise.all([
        ctx.db.courseRegistration.findMany({
          where,
          select: {
            id: true,
            registrantFirstName: true,
            registrantLastName: true,
            registrantEmail: true,
            registrationStatus: true,
            siblingDiscountStatus: true,
            siblingDiscountAmount: true,
            paymentMethod: true,
            totalPrice: true,
            downPaymentAmount: true,
            downPaymentStatus: true,
            downPaymentPaidAmount: true,
            invoiceId: true,
            createdAt: true,
            invoices: {
              select: {
                id: true,
                status: true,
                invoiceNumber: true,
                totalAmount: true,
                paidAt: true,
                paidAmount: true,
              },
            },
            course: {
              select: { id: true, title: true, startDate: true },
            },
            _count: { select: { participants: true } },
          },
          // Zweites Kriterium, damit das Blättern bei gleichen Werten stabil
          // bleibt und keine Zeile zweimal auf verschiedenen Seiten auftaucht.
          orderBy: registrationOrderBy(input.sortBy, input.sortOrder),
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        ctx.db.courseRegistration.count({ where }),
      ]);

      return {
        registrations,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  /** Courses that have at least one registration — for the admin filter. */
  getCoursesWithRegistrations: permissionProcedure(
    PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
  ).query(async ({ ctx }) => {
    return ctx.db.course.findMany({
      where: { registrations: { some: {} } },
      select: { id: true, title: true, startDate: true },
      orderBy: { startDate: "desc" },
      take: 200,
    });
  }),

  getMyActiveRegistrationForCourse: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const registration = await ctx.db.courseRegistration.findFirst({
        where: {
          courseId: input.courseId,
          registrantEmail: ctx.session.user.email,
          registrationStatus: {
            in: [RegistrationStatus.CONFIRMED, RegistrationStatus.WAITLIST],
          },
        },
        include: {
          participants: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return registration;
    }),

  getMyRegistrations: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: z.enum(RegistrationStatus).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        registrantEmail: ctx.session.user.email,
        ...(input.status && { registrationStatus: input.status }),
      };

      const [registrations, total] = await Promise.all([
        ctx.db.courseRegistration.findMany({
          where,
          include: {
            participants: true,
            course: {
              select: {
                id: true,
                title: true,
                startDate: true,
                endDate: true,
                registrationDeadline: true,
                registrationOpen: true,
                maxParticipants: true,
                allowWaitingList: true,
                allowSiblingDiscount: true,
                priceOptions: {
                  select: {
                    id: true,
                    label: true,
                    description: true,
                    price: true,
                    maxParticipants: true,
                  },
                },
                location: {
                  select: {
                    name: true,
                    city: true,
                  },
                },
              },
            },
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.courseRegistration.count({ where }),
      ]);

      return {
        registrations,
        total,
        page: input.page,
        limit: input.limit,
        pages: Math.ceil(total / input.limit),
      };
    }),

  updateMyRegistration: publicProcedure
    .input(
      z.object({
        id: z.string(),
        /** Magic-link credential for registrants without an account. */
        accessToken: z.string().optional(),
        registrantPhone: internationalPhoneSchema.optional(),
        useSeparateBilling: z.boolean().optional(),
        billingCompany: z.string().max(200).optional(),
        billingFirstName: z.string().max(100).optional(),
        billingLastName: z.string().max(100).optional(),
        billingStreet: z.string().max(200).optional(),
        billingZipCode: z.string().max(20).optional(),
        billingCity: z.string().max(100).optional(),
        billingEmail: z.email().optional(),
        notes: z.string().max(2000).optional(),
        participants: z.array(
          z.object({
            id: z.string().optional(),
            firstName: z.string().min(1).max(100),
            lastName: z.string().min(1).max(100),
            birthDate: z.date().refine((date) => date < new Date(), {
              message: "Geburtsdatum muss in der Vergangenheit liegen",
            }),
            city: z.string().min(1).max(100),
            instrument: z.string().max(100).optional(),
            priceOptionId: z.string().min(1),
            customFields: z.record(z.string(), z.any()).optional(),
            siblingGroupId: z.string().optional(),
          }),
        ),
        siblingDiscountApplied: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        id,
        accessToken,
        participants: participantsInput,
        ...registrationData
      } = input;

      const registration = await ctx.db.courseRegistration.findUnique({
        where: { id },
        include: {
          participants: true,
          course: {
            include: {
              priceOptions: true,
              customFields: true,
              createdBy: { select: { id: true } },
              collaborators: collaboratorsForViewer(viewerId(ctx)),
              _count: {
                select: {
                  registrations: {
                    where: {
                      registrationStatus: RegistrationStatus.CONFIRMED,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registration not found",
        });
      }

      const isOwner = isRegistrationOwner(ctx, registration, accessToken);
      const userId = viewerId(ctx);
      const isCreator =
        userId !== null && registration.course.createdBy?.id === userId;
      const canManageRegistrations =
        userId !== null &&
        (await userHasPermission(
          userId,
          PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
          ctx.permissionCache,
        ));
      const teamMember = viewerIsCourseTeamMember(
        registration.course.collaborators,
      );
      const isStaff = teamMember || isCreator || canManageRegistrations;

      if (!isOwner && !isStaff) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot edit registration of another user",
        });
      }

      if (registration.registrationStatus === RegistrationStatus.CANCELLED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot edit a cancelled registration",
        });
      }

      if (!isStaff) {
        const now = new Date();
        const courseStart = new Date(registration.course.startDate);
        const ownerCanEditByTime =
          courseStart > now &&
          !isRegistrationDeadlinePassed(
            registration.course.registrationDeadline,
            now,
          );
        if (!ownerCanEditByTime) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Registration edit deadline has passed",
          });
        }
      }

      const course = registration.course;

      /** Preiskategorie, in der ein Teilnehmer bereits gespeichert ist. */
      const bookedPriceOptionId = new Map(
        registration.participants.map((p) => [p.id, p.priceOptionId]),
      );

      const {
        participants: participantsWithPriceOptions,
        originalTotalPrice: undiscountedTotalPrice,
      } = prepareParticipantsForCourse(participantsInput, course, {
        allowAgeMismatch: (participant) =>
          // Das Kursteam darf eine Kategorie entgegen ihrer Altersgrenze
          // vergeben, wie bei `createByStaff`.
          isStaff ||
          // Und wer in einer Kategorie schon angemeldet ist, bleibt es: wurde
          // die Grenze nachträglich enger gezogen, ließe sich die Anmeldung
          // sonst nicht einmal mehr in einem anderen Feld ändern.
          (participant.id != null &&
            bookedPriceOptionId.get(participant.id) ===
              participant.priceOptionId),
      });

      let originalTotalPrice = undiscountedTotalPrice;
      let totalPrice = originalTotalPrice;
      let siblingDiscountAmount = 0;
      let siblingDiscountStatus = registration.siblingDiscountStatus;

      if (input.siblingDiscountApplied && course.allowSiblingDiscount) {
        // Bei einer aufgeteilten Anmeldung zählen die Geschwister in den
        // anderen, nicht stornierten Teilen mit — sonst verlöre ein Teil beim
        // Bearbeiten seinen Rabatt, nur weil das ältere Geschwister wartet.
        const otherPartParticipants = registration.registrationGroupId
          ? await ctx.db.participant.findMany({
              where: {
                registration: {
                  registrationGroupId: registration.registrationGroupId,
                  id: { not: id },
                  registrationStatus: { not: RegistrationStatus.CANCELLED },
                },
              },
              select: {
                birthDate: true,
                siblingGroupId: true,
                priceOptionId: true,
              },
            })
          : [];
        const priced = (p: {
          birthDate: Date;
          siblingGroupId?: string | null;
          priceOptionId?: string | null;
        }) => ({
          birthDate: p.birthDate,
          siblingGroupId: p.siblingGroupId,
          price: priceOptionPrice(course, p),
        });
        siblingDiscountAmount = siblingDiscountWithinGroup(
          participantsWithPriceOptions.map(priced),
          otherPartParticipants.map(priced),
        );

        if (siblingDiscountAmount > 0) {
          totalPrice = roundMoney(originalTotalPrice - siblingDiscountAmount);
          if (siblingDiscountStatus === "NONE") {
            siblingDiscountStatus = SiblingDiscountStatus.PENDING;
          }
        } else {
          siblingDiscountStatus = SiblingDiscountStatus.NONE;
          siblingDiscountAmount = 0;
          originalTotalPrice = 0;
        }
      } else {
        siblingDiscountStatus = SiblingDiscountStatus.NONE;
        siblingDiscountAmount = 0;
        originalTotalPrice = 0;
      }

      // Anzahlung: Anmeldende dürfen die Teilnehmerzahl (und, wenn der Betrag
      // an der Kategorie hängt, die Kategorien) nicht selbst ändern. Das
      // Kursteam darf — der Betrag wird dann neu berechnet, ein bereits
      // eingegangener Betrag bleibt als solcher festgehalten.
      if (!isStaff) {
        const violation = registrantEditViolation({
          course,
          bookedDownPayment: registration.downPaymentAmount,
          before: registration.participants,
          after: participantsWithPriceOptions,
        });
        if (violation) {
          throw new TRPCError({ code: "BAD_REQUEST", message: violation });
        }
      }
      const recalculatedDownPayment = registrationDownPayment(
        course,
        participantsWithPriceOptions,
      );
      const nextDownPaymentAmount =
        recalculatedDownPayment ??
        (downPaymentReceived(registration) > 0
          ? registration.downPaymentAmount
          : null);
      const downPaymentData: Prisma.CourseRegistrationUncheckedUpdateInput =
        nextDownPaymentAmount === registration.downPaymentAmount
          ? {}
          : {
              downPaymentAmount: nextDownPaymentAmount,
              downPaymentStatus:
                nextDownPaymentAmount == null
                  ? null
                  : (registration.downPaymentStatus ?? DownPaymentStatus.OPEN),
              downPaymentPaidAmount: pinnedPaidAmountAfterChange(
                registration,
                nextDownPaymentAmount,
              ),
            };

      // Plätze belegt nur eine bestätigte Anmeldung — und die muss beim
      // Bearbeiten in den Kurs passen, ob er eine Warteliste hat oder nicht.
      // Mit Warteliste wurde das bisher übersprungen: eine bestätigte
      // Anmeldung konnte Teilnehmer hinzufügen und den Kurs überbuchen. Eine
      // Anmeldung auf der Warteliste belegt nichts; ihre Plätze prüft erst das
      // Nachrücken.
      const holdsSeats =
        registration.registrationStatus === RegistrationStatus.CONFIRMED;

      // Geprüft wird nur, was die Änderung dazu belegt: in einem bewusst
      // überbuchten Kurs soll sich trotzdem die Telefonnummer ändern oder ein
      // Teilnehmer abmelden lassen.
      const bookedByOptionId: Record<string, number> = {};
      for (const participant of registration.participants) {
        const optionId = resolveParticipantPriceOption(
          participant,
          course.priceOptions,
        )?.id;
        if (optionId) {
          bookedByOptionId[optionId] = (bookedByOptionId[optionId] ?? 0) + 1;
        }
      }

      // Capacity checks and the delete-and-rewrite of participants run in one
      // SERIALIZABLE transaction: no overbooking through concurrent edits, and
      // no half-rewritten participant list if anything fails midway.
      const updatedRegistration = await runSerializable(ctx.db, async (tx) => {
        if (
          holdsSeats &&
          participantsWithPriceOptions.length > registration.participants.length
        ) {
          const currentParticipantsExcludingThis =
            await countConfirmedParticipants(tx, course.id, id);
          const maxParticipants = computeCourseCapacity(course);

          if (
            currentParticipantsExcludingThis +
              participantsWithPriceOptions.length >
            maxParticipants
          ) {
            const availableSpots =
              maxParticipants - currentParticipantsExcludingThis;
            if (availableSpots > 0) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Nur noch ${availableSpots} ${availableSpots === 1 ? "Platz" : "Plätze"} verfügbar, aber Sie versuchen ${participantsWithPriceOptions.length} ${participantsWithPriceOptions.length === 1 ? "Teilnehmer" : "Teilnehmer"} anzumelden. Bitte reduzieren Sie die Anzahl der Teilnehmer.`,
              });
            }
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Der Kurs ist ausgebucht – es können keine Teilnehmer hinzugefügt werden.",
            });
          }
        }

        if (holdsSeats) {
          const grownOptionCounts: Record<string, number> = {};
          const priceOptionCounts: Record<string, number> = {};
          for (const participant of participantsWithPriceOptions) {
            if (participant.priceOptionId) {
              priceOptionCounts[participant.priceOptionId] =
                (priceOptionCounts[participant.priceOptionId] ?? 0) + 1;
            }
          }
          for (const [optionId, count] of Object.entries(priceOptionCounts)) {
            if (count > (bookedByOptionId[optionId] ?? 0)) {
              grownOptionCounts[optionId] = count;
            }
          }
          await assertPriceTierCapacity(
            tx,
            course.id,
            course.priceOptions,
            grownOptionCounts,
            id,
          );
        }

        const existingParticipantIds = participantsWithPriceOptions
          .filter((p) => p.id)
          .map((p) => p.id!);

        await tx.participant.deleteMany({
          where: {
            registrationId: id,
            id: { notIn: existingParticipantIds },
          },
        });

        for (const participant of participantsWithPriceOptions) {
          const {
            id: participantId,
            siblingGroupId,
            ...participantData
          } = participant;

          const prismaData = {
            firstName: participantData.firstName,
            lastName: participantData.lastName,
            birthDate: participantData.birthDate,
            city: participantData.city,
            instrument: participantData.instrument ?? null,
            priceOptionId: participantData.priceOptionId ?? null,
            priceOption: participantData.priceOption ?? null,
            customFields: (participantData.customFields ??
              {}) as Prisma.InputJsonValue,
            siblingGroupId: siblingGroupId ?? null,
          };

          if (participantId) {
            await tx.participant.update({
              where: { id: participantId },
              data: prismaData,
            });
          } else {
            await tx.participant.create({
              data: {
                ...prismaData,
                registrationId: id,
              },
            });
          }
        }

        return tx.courseRegistration.update({
          where: { id },
          data: {
            ...registrationData,
            totalPrice, // Use server-calculated price
            ...downPaymentData,
            siblingDiscountApplied:
              input.siblingDiscountApplied ??
              registration.siblingDiscountApplied,
            siblingDiscountStatus,
            originalTotalPrice:
              siblingDiscountAmount > 0 ? originalTotalPrice : null,
            siblingDiscountAmount:
              siblingDiscountAmount > 0 ? siblingDiscountAmount : null,
          },
          include: {
            participants: true,
            course: {
              select: {
                id: true,
                title: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        });
      });

      return updatedRegistration;
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        registrationStatus: z.nativeEnum(RegistrationStatus),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const registration = await ctx.db.courseRegistration.findUnique({
        where: { id: input.id },
        include: {
          participants: true,
          course: {
            include: {
              createdBy: { select: { id: true } },
              collaborators: collaboratorsForViewer(viewerId(ctx)),
            },
          },
        },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registration not found",
        });
      }

      const isCreator =
        registration.course.createdBy?.id === ctx.session.user.id;
      const canManageRegistrations = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
        ctx.permissionCache,
      );
      const isAdmin = canManageRegistrations;
      const teamMember = viewerIsCourseTeamMember(
        registration.course.collaborators,
      );

      if (!teamMember && !isCreator && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      const previousStatus = registration.registrationStatus;
      const wasWaitlist = previousStatus === RegistrationStatus.WAITLIST;
      const isNowConfirmed =
        input.registrationStatus === RegistrationStatus.CONFIRMED;

      const updatedRegistration = await runSerializable(ctx.db, async (tx) => {
        // Promoting to CONFIRMED consumes seats — re-check capacity first.
        if (isNowConfirmed && previousStatus !== RegistrationStatus.CONFIRMED) {
          const course = await tx.course.findUniqueOrThrow({
            where: { id: registration.courseId },
            select: {
              maxParticipants: true,
              priceOptions: {
                select: { id: true, label: true, maxParticipants: true },
              },
            },
          });
          const currentCount = await countConfirmedParticipants(
            tx,
            registration.courseId,
            registration.id,
          );
          const capacity = computeCourseCapacity(course);
          if (currentCount + registration.participants.length > capacity) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Der Kurs ist bereits voll — die Anmeldung kann nicht bestätigt werden.",
            });
          }

          // Auch die Preiskategorien: eine volle Kategorie hat keinen Platz,
          // selbst wenn der Kurs noch welche hat. Gezählt wird nach id wie in
          // allen übrigen Prüfungen — Altbestand über ein eindeutiges Label.
          const additionsByOptionId: Record<string, number> = {};
          for (const participant of registration.participants) {
            const optionId = resolveParticipantPriceOption(
              participant,
              course.priceOptions,
            )?.id;
            if (optionId) {
              additionsByOptionId[optionId] =
                (additionsByOptionId[optionId] ?? 0) + 1;
            }
          }
          const fullOption = await findFullPriceTier(
            tx,
            registration.courseId,
            course.priceOptions,
            additionsByOptionId,
            registration.id,
          );
          if (fullOption) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `${priceTierFullMessage(fullOption)} Die Anmeldung kann nicht bestätigt werden.`,
            });
          }
        }

        return tx.courseRegistration.update({
          where: { id: input.id },
          data: {
            registrationStatus: input.registrationStatus,
            notes: input.notes,
            // Ein Nachrück-Angebot gilt nur, solange die Anmeldung wartet.
            ...(input.registrationStatus !== RegistrationStatus.WAITLIST &&
              CLEARED_PROMOTION_OFFER),
          },
          include: {
            participants: true,
            course: {
              select: {
                title: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        });
      });

      const emailService = await getEmailService();
      if (emailService.isEmailConfigured() && wasWaitlist && isNowConfirmed) {
        try {
          await emailService.sendCourseRegistrationConfirmedEmail(
            updatedRegistration.registrantEmail,
            updatedRegistration.registrantFirstName,
            updatedRegistration.registrantLastName,
            updatedRegistration.course.title,
            updatedRegistration.course.startDate,
            updatedRegistration.course.endDate,
            updatedRegistration.totalPrice,
            updatedRegistration.participants.length,
            updatedRegistration.id,
            registrationAccessUrl(updatedRegistration),
            // Mit der Platzbestätigung wird die Anzahlung fällig.
            downPaymentMailInfo(updatedRegistration, registration.course),
          );
        } catch (error) {
          log.error("Failed to send confirmation email:", error);
        }
      }

      // Demoting a confirmed registration frees seats for the waitlist.
      if (
        previousStatus === RegistrationStatus.CONFIRMED &&
        input.registrationStatus !== RegistrationStatus.CONFIRMED
      ) {
        const promoted = await promoteFromWaitlist(
          ctx.db,
          registration.courseId,
        );
        await sendPromotionEmails(promoted);
      }

      void logAudit(ctx.db, {
        actorId: ctx.session.user.id,
        actorEmail: ctx.session.user.email,
        action: "registration.status",
        entityType: "registration",
        entityId: input.id,
        details: {
          registrationStatus: input.registrationStatus,
          previousStatus,
        },
      });

      return updatedRegistration;
    }),

  // Cancellation requires a session: every UI path (own registrations,
  // dashboard) is login-gated, and an anonymous branch keyed only on the
  // registrant e-mail would let anyone with a leaked registration id cancel
  // it (the e-mail used to be readable from the same record).
  cancel: publicProcedure
    .input(
      z.object({
        id: z.string(),
        /** Magic-link credential for registrants without an account. */
        accessToken: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const registration = await ctx.db.courseRegistration.findUnique({
        where: { id: input.id },
        include: {
          participants: true,
          course: {
            select: {
              title: true,
              startDate: true,
              endDate: true,
              createdById: true,
              collaborators: collaboratorsForViewer(viewerId(ctx)),
            },
          },
        },
      });
      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registration not found",
        });
      }
      const isOwner = isRegistrationOwner(ctx, registration, input.accessToken);
      const userId = viewerId(ctx);
      const isCreator =
        userId !== null && registration.course.createdById === userId;
      const canManageRegistrations =
        userId !== null &&
        (await userHasPermission(
          userId,
          PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
          ctx.permissionCache,
        ));
      const teamMember = viewerIsCourseTeamMember(
        registration.course.collaborators,
      );
      const canCancelAsStaff =
        teamMember || isCreator || canManageRegistrations;
      if (!isOwner && !canCancelAsStaff) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot cancel registration of another user",
        });
      }

      // Mit Anzahlung storniert nur das Kursteam: ob und wie erstattet wird,
      // klärt es mit der Kasse.
      if (!canCancelAsStaff && !registrantMayCancelDownPayment(registration)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Anmeldungen mit Anzahlung kann nur das Kursteam stornieren. Bitte wende dich an das Kursteam.",
        });
      }

      const wasAlreadyCancelled =
        registration.registrationStatus === RegistrationStatus.CANCELLED;

      const updated = await ctx.db.courseRegistration.update({
        where: { id: input.id },
        data: {
          registrationStatus: RegistrationStatus.CANCELLED,
        },
        include: {
          participants: true,
          course: {
            select: {
              title: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      });

      const emailService = await getEmailService();
      if (emailService.isEmailConfigured() && !wasAlreadyCancelled) {
        try {
          await emailService.sendCourseRegistrationCancelledEmail(
            updated.registrantEmail,
            updated.registrantFirstName,
            updated.registrantLastName,
            updated.course.title,
            updated.course.startDate,
            updated.course.endDate,
            updated.participants.length,
            updated.id,
          );
        } catch (error) {
          log.error("Failed to send cancellation email:", error);
        }
      }

      // A cancellation frees seats — offer them to the waitlist (FIFO).
      if (!wasAlreadyCancelled) {
        const promoted = await promoteFromWaitlist(
          ctx.db,
          registration.courseId,
        );
        await sendPromotionEmails(promoted);
      }

      return updated;
    }),

  /**
   * Nachrück-Angebot annehmen: die gewählten Teilnehmer rücken nach, die
   * übrigen warten weiter. Antworten dürfen die Anmeldenden (auch über den
   * Zugangslink) und das Kursteam.
   */
  acceptPromotionOffer: publicProcedure
    .input(
      z.object({
        id: z.string(),
        accessToken: z.string().optional(),
        participantIds: z.array(z.string()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertMayAnswerPromotionOffer(ctx, input.id, input.accessToken);
      return acceptPromotionOffer(ctx.db, {
        registrationId: input.id,
        participantIds: input.participantIds,
        actorId: viewerId(ctx),
      });
    }),

  /**
   * Nachrück-Angebot ablehnen: die Plätze gehen an die Nächsten, die
   * Anmeldung behält ihren Platz auf der Warteliste.
   */
  declinePromotionOffer: publicProcedure
    .input(z.object({ id: z.string(), accessToken: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await assertMayAnswerPromotionOffer(ctx, input.id, input.accessToken);
      await declinePromotionOffer(ctx.db, {
        registrationId: input.id,
        actorId: viewerId(ctx),
      });
      return { declined: true };
    }),

  /**
   * Anzahlung einer Anmeldung verbuchen: eingegangen, zurückgenommen, oder —
   * nach einer Stornierung — erstattet bzw. einbehalten. Es gilt dieselbe
   * Rechteregel wie für Zahlungen an Rechnungen (Kursorganisation oder
   * registrations.mark_paid), siehe helpers/invoice-access.
   */
  setDownPaymentStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(DownPaymentStatus),
        /** Wertstellung; ohne Angabe der heutige Tag (bzw. der bisherige). */
        paidAt: z.date().optional(),
        /** Eingegangener Betrag; weglassen heißt "voller Betrag". */
        paidAmount: z.number().min(0).max(100_000).nullish(),
        note: z.string().trim().max(500).nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const registration = await ctx.db.courseRegistration.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          courseId: true,
          registrationStatus: true,
          downPaymentAmount: true,
          downPaymentStatus: true,
          downPaymentPaidAt: true,
          downPaymentPaidAmount: true,
          course: {
            select: { id: true, createdById: true, invoicingEnabled: true },
          },
        },
      });
      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registration not found",
        });
      }

      if (
        !(await userCanBookInvoicePayments(
          ctx.db,
          ctx.session.user.id,
          registration.course,
          ctx.permissionCache,
        ))
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Keine Berechtigung, Anzahlungen zu verbuchen",
        });
      }

      const amount = registration.downPaymentAmount;
      const previous = registration.downPaymentStatus;
      if (!amount || !previous) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Diese Anmeldung hat keine Anzahlung.",
        });
      }

      const settlesRefund =
        input.status === DownPaymentStatus.REFUNDED ||
        input.status === DownPaymentStatus.RETAINED;
      if (settlesRefund && previous === DownPaymentStatus.OPEN) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Erstattet oder einbehalten werden kann nur eine eingegangene Anzahlung.",
        });
      }

      // Aus "erstattet"/"einbehalten" zurück auf "bezahlt" behält Datum und
      // Betrag der ursprünglichen Buchung.
      const wasReceived = previous !== DownPaymentStatus.OPEN;
      const note =
        input.note !== undefined ? { downPaymentNote: input.note } : {};

      let data: Prisma.CourseRegistrationUpdateInput;
      if (input.status === DownPaymentStatus.OPEN) {
        data = {
          downPaymentStatus: DownPaymentStatus.OPEN,
          downPaymentPaidAt: null,
          downPaymentPaidAmount: null,
          downPaymentPaidBy: { disconnect: true },
          ...note,
        };
      } else if (input.status === DownPaymentStatus.PAID) {
        data = {
          downPaymentStatus: DownPaymentStatus.PAID,
          downPaymentPaidAt:
            input.paidAt ??
            (wasReceived ? registration.downPaymentPaidAt : null) ??
            new Date(),
          downPaymentPaidAmount:
            input.paidAmount != null
              ? (bookedAmountFor(input.paidAmount, amount) ?? null)
              : input.paidAmount === null || !wasReceived
                ? null
                : registration.downPaymentPaidAmount,
          ...(!wasReceived && {
            downPaymentPaidBy: { connect: { id: ctx.session.user.id } },
          }),
          ...note,
        };
      } else {
        data = { downPaymentStatus: input.status, ...note };
      }

      const updated = await ctx.db.courseRegistration.update({
        where: { id: registration.id },
        data,
      });

      void logAudit(ctx.db, {
        actorId: ctx.session.user.id,
        actorEmail: ctx.session.user.email,
        action: "registration.down_payment",
        entityType: "registration",
        entityId: registration.id,
        details: {
          courseId: registration.courseId,
          previousStatus: previous,
          status: input.status,
          downPaymentAmount: amount,
          paidAmount: updated.downPaymentPaidAmount ?? amount,
        },
      });

      return updated;
    }),

  delete: permissionProcedure(PERMISSIONS.COURSES_MANAGE_REGISTRATIONS)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await ctx.db.courseRegistration.delete({
        where: { id: input.id },
        select: { courseId: true, registrationStatus: true },
      });

      if (deleted.registrationStatus === RegistrationStatus.CONFIRMED) {
        const promoted = await promoteFromWaitlist(ctx.db, deleted.courseId);
        await sendPromotionEmails(promoted);
      }

      void logAudit(ctx.db, {
        actorId: ctx.session.user.id,
        actorEmail: ctx.session.user.email,
        action: "registration.delete",
        entityType: "registration",
        entityId: input.id,
        details: { courseId: deleted.courseId },
      });

      return { success: true };
    }),

  getStatistics: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({
        where: { id: input.courseId },
        include: {
          collaborators: collaboratorsForViewer(viewerId(ctx)),
          priceOptions: { select: { label: true, maxParticipants: true } },
        },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      const isCreator = course.createdById === ctx.session.user.id;
      const canManageRegistrations = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
        ctx.permissionCache,
      );
      const isAdmin = canManageRegistrations;
      const teamMember = viewerIsCourseTeamMember(course.collaborators);

      if (!teamMember && !isCreator && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      const registrations = await ctx.db.courseRegistration.findMany({
        where: { courseId: input.courseId },
        include: {
          participants: true,
          invoices: {
            select: {
              status: true,
              totalAmount: true,
              paidAt: true,
              paidAmount: true,
            },
          },
        },
      });

      const confirmed = registrations.filter(
        (r) => r.registrationStatus === RegistrationStatus.CONFIRMED,
      );
      const waitlist = registrations.filter(
        (r) => r.registrationStatus === RegistrationStatus.WAITLIST,
      );
      const cancelled = registrations.filter(
        (r) => r.registrationStatus === RegistrationStatus.CANCELLED,
      );

      const maxParticipants = computeCourseCapacity(course);

      const totalParticipants = confirmed.reduce(
        (sum, r) => sum + r.participants.length,
        0,
      );
      const totalRevenue = confirmed.reduce((sum, r) => sum + r.totalPrice, 0);

      // Zahlung hängt jetzt an der Rechnung: "bezahlt" heißt, dass jede
      // ausgestellte Rechnung dieser Anmeldung beglichen ist. Anmeldungen ohne
      // ausgestellte Rechnung zählen weder als bezahlt noch als offen — für sie
      // gibt es schlicht nichts zu verbuchen.
      const withInvoices = confirmed.map((r) => ({
        registration: r,
        published: r.invoices.filter(
          (invoice) => invoice.status === InvoiceStatus.PUBLISHED,
        ),
      }));

      const invoiced = withInvoices.filter((r) => r.published.length > 0);
      const paidCount = invoiced.filter((r) =>
        r.published.every((invoice) => invoiceOpenAmount(invoice) === 0),
      ).length;
      const pendingPayment = invoiced.length - paidCount;
      const openAmount = invoiced.reduce(
        (sum, r) =>
          sum +
          r.published.reduce(
            (inner, invoice) => inner + invoiceOpenAmount(invoice),
            0,
          ),
        0,
      );
      /** Bestätigte Anmeldungen, zu denen noch gar keine Rechnung existiert. */
      const uninvoicedCount = withInvoices.length - invoiced.length;

      return {
        total: registrations.length,
        confirmed: confirmed.length,
        waitlist: waitlist.length,
        cancelled: cancelled.length,
        totalParticipants,
        availableSpots: Math.max(0, maxParticipants - totalParticipants),
        totalRevenue,
        paidCount,
        pendingPayment,
        openAmount,
        uninvoicedCount,
      };
    }),

  approveSiblingDiscount: permissionProcedure(
    PERMISSIONS.REGISTRATIONS_MANAGE_SIBLING_DISCOUNT,
  )
    .input(
      z.object({
        registrationId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const registration = await ctx.db.courseRegistration.findUnique({
        where: { id: input.registrationId },
        include: { course: true },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registration not found",
        });
      }

      if (
        registration.siblingDiscountStatus !== SiblingDiscountStatus.PENDING
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Registration does not have a pending sibling discount",
        });
      }

      // Approving the discount must not change the registration status: a
      // waitlisted registration stays waitlisted (promotion goes through
      // updateStatus, which re-checks capacity) and a cancelled one stays
      // cancelled. The previous behavior force-set CONFIRMED here, which
      // could overbook a full course.
      // Aufgeteilt gilt die Entscheidung für alle Teile, über die der Rabatt
      // berechnet wurde — mit einer Mail über die Summe.
      const parts = await siblingDiscountParts(
        ctx.db,
        registration,
        SiblingDiscountStatus.PENDING,
      );
      await ctx.db.courseRegistration.updateMany({
        where: { id: { in: parts.map((part) => part.id) } },
        data: {
          siblingDiscountStatus: SiblingDiscountStatus.APPROVED,
        },
      });
      const updated = await ctx.db.courseRegistration.findUniqueOrThrow({
        where: { id: input.registrationId },
        include: {
          participants: true,
          course: {
            select: {
              title: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      });
      const totals = sumDiscountParts(parts);

      const emailService = await getEmailService();
      if (
        emailService.isEmailConfigured() &&
        totals.siblingDiscountAmount > 0
      ) {
        try {
          await emailService.sendSiblingDiscountApprovedEmail(
            updated.registrantEmail,
            updated.registrantFirstName,
            updated.registrantLastName,
            updated.course.title,
            updated.course.startDate,
            updated.course.endDate,
            totals.originalTotalPrice,
            totals.siblingDiscountAmount,
            totals.totalPrice,
            totals.participantCount,
            updated.id,
            registrationAccessUrl(updated),
          );
        } catch (error) {
          log.error("Failed to send discount approval email:", error);
        }
      }

      return updated;
    }),

  rejectSiblingDiscount: permissionProcedure(
    PERMISSIONS.REGISTRATIONS_MANAGE_SIBLING_DISCOUNT,
  )
    .input(
      z.object({
        registrationId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const registration = await ctx.db.courseRegistration.findUnique({
        where: { id: input.registrationId },
        include: { course: true },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registration not found",
        });
      }

      if (
        registration.siblingDiscountStatus !== SiblingDiscountStatus.PENDING
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Registration does not have a pending sibling discount",
        });
      }

      // Wie beim Genehmigen: aufgeteilt gilt die Ablehnung für alle Teile,
      // jeder zurück auf seinen eigenen vollen Preis.
      const parts = await siblingDiscountParts(
        ctx.db,
        registration,
        SiblingDiscountStatus.PENDING,
      );
      await ctx.db.$transaction(
        parts.map((part) =>
          ctx.db.courseRegistration.update({
            where: { id: part.id },
            data: {
              siblingDiscountStatus: SiblingDiscountStatus.REJECTED,
              totalPrice: part.originalTotalPrice ?? part.totalPrice,
              siblingDiscountAmount: null,
              originalTotalPrice: null,
            },
          }),
        ),
      );
      const totals = sumDiscountParts(parts);
      const updated = await ctx.db.courseRegistration.findUniqueOrThrow({
        where: { id: input.registrationId },
        include: {
          participants: true,
          course: {
            select: {
              title: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      });

      const emailService = await getEmailService();
      if (emailService.isEmailConfigured()) {
        try {
          await emailService.sendSiblingDiscountRejectedEmail(
            updated.registrantEmail,
            updated.registrantFirstName,
            updated.registrantLastName,
            updated.course.title,
            updated.course.startDate,
            updated.course.endDate,
            totals.originalTotalPrice,
            totals.participantCount,
            updated.id,
            registrationAccessUrl(updated),
          );
        } catch (error) {
          log.error("Failed to send discount rejection email:", error);
        }
      }

      return updated;
    }),

  /**
   * Den Geschwisterkindrabatt nachträglich auf eine bestehende Anmeldung
   * anwenden — für die Fälle, in denen beim Anmelden niemand daran gedacht hat.
   *
   * Wer den Rabatt verwalten darf, gewährt ihn damit zugleich (APPROVED). Wer
   * nur den Kurs verantwortet, stößt ihn an; er landet dann wie ein beantragter
   * Rabatt in der Prüfung (PENDING).
   */
  applySiblingDiscount: protectedProcedure
    .input(z.object({ registrationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const registration = await ctx.db.courseRegistration.findUnique({
        where: { id: input.registrationId },
        include: {
          participants: true,
          invoices: { select: { status: true } },
          course: {
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
              createdById: true,
              allowSiblingDiscount: true,
              priceOptions: { select: { id: true, price: true } },
            },
          },
        },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registration not found",
        });
      }

      const { allowed, canDecide } = await userCanManageSiblingDiscount(
        ctx.db,
        ctx.session.user.id,
        registration.course,
        ctx.permissionCache,
      );
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Keine Berechtigung, den Geschwisterkindrabatt zu gewähren",
        });
      }

      if (!registration.course.allowSiblingDiscount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Für diesen Kurs ist der Geschwisterkindrabatt nicht freigeschaltet",
        });
      }

      if (registration.registrationStatus === RegistrationStatus.CANCELLED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Die Anmeldung ist storniert",
        });
      }

      if (
        registration.siblingDiscountStatus === SiblingDiscountStatus.PENDING ||
        registration.siblingDiscountStatus === SiblingDiscountStatus.APPROVED
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Für diese Anmeldung ist der Geschwisterkindrabatt bereits vermerkt",
        });
      }

      // Eine veröffentlichte Rechnung ist bereits beim Empfänger — der Preis
      // dahinter darf sich nicht mehr still ändern.
      if (
        registration.invoices.some(
          (invoice) => invoice.status === InvoiceStatus.PUBLISHED,
        )
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Für diese Anmeldung wurde bereits eine Rechnung veröffentlicht",
        });
      }

      // Aufgeteilt zählen die Geschwister in den übrigen Teilen mit; dieser
      // Teil bekommt den Anteil seiner eigenen Teilnehmer.
      const priced = (participant: {
        birthDate: Date;
        siblingGroupId: string | null;
        priceOptionId: string | null;
      }) => ({
        birthDate: participant.birthDate,
        siblingGroupId: participant.siblingGroupId,
        price: priceOptionPrice(registration.course, participant),
      });
      const totalDiscount = siblingDiscountWithinGroup(
        registration.participants.map(priced),
        (await otherPartParticipants(ctx.db, registration)).map(priced),
      );

      if (totalDiscount <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Kein Rabatt möglich: Es müssen mindestens zwei Teilnehmer als Geschwister zusammengefasst und kostenpflichtig sein",
        });
      }

      // Grundlage ist der aktuell vereinbarte Preis, nicht eine Neuberechnung
      // aus den Preiskategorien: die können sich seit der Anmeldung geändert
      // haben, der zugesagte Betrag nicht.
      const originalTotalPrice = registration.totalPrice;
      const status = canDecide
        ? SiblingDiscountStatus.APPROVED
        : SiblingDiscountStatus.PENDING;

      const updated = await ctx.db.courseRegistration.update({
        where: { id: input.registrationId },
        data: {
          siblingDiscountApplied: true,
          siblingDiscountStatus: status,
          siblingDiscountAmount: totalDiscount,
          originalTotalPrice,
          totalPrice: roundMoney(originalTotalPrice - totalDiscount),
        },
        include: {
          participants: true,
          course: {
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      });

      void logAudit(ctx.db, {
        actorId: ctx.session.user.id,
        actorEmail: ctx.session.user.email,
        action: "registration.sibling_discount_applied",
        entityType: "registration",
        entityId: updated.id,
        details: {
          courseId: registration.course.id,
          status,
          discountAmount: totalDiscount,
          originalTotalPrice,
          totalPrice: updated.totalPrice,
        },
      });

      if (status === SiblingDiscountStatus.PENDING) {
        void notifyUsersWithPermission(
          ctx.db,
          PERMISSIONS.REGISTRATIONS_MANAGE_SIBLING_DISCOUNT,
          {
            type: "registration.sibling_discount_pending",
            title: `Geschwisterkindrabatt zu prüfen: ${updated.course.title}`,
            body: `${updated.registrantFirstName} ${updated.registrantLastName} — ${totalDiscount.toFixed(2)} €`,
            url: `/dashboard/courses/${updated.course.id}/participants/${updated.id}`,
          },
          ctx.session.user.id,
        );
      } else {
        const emailService = await getEmailService();
        if (emailService.isEmailConfigured()) {
          try {
            await emailService.sendSiblingDiscountApprovedEmail(
              updated.registrantEmail,
              updated.registrantFirstName,
              updated.registrantLastName,
              updated.course.title,
              updated.course.startDate,
              updated.course.endDate,
              originalTotalPrice,
              totalDiscount,
              updated.totalPrice,
              updated.participants.length,
              updated.id,
              registrationAccessUrl(updated),
            );
          } catch (error) {
            log.error("Failed to send discount approval email:", error);
          }
        }
      }

      return updated;
    }),

  /**
   * Den Geschwisterkindrabatt einer Anmeldung wieder entfernen — die Rücknahme
   * zu applySiblingDiscount und zur Genehmigung.
   *
   * Nicht gedacht für die Ablehnung eines beantragten Rabatts: dafür gibt es
   * rejectSiblingDiscount, das den Antrag begründet beantwortet. Hier geht es um
   * den versehentlich gewährten Rabatt.
   */
  removeSiblingDiscount: protectedProcedure
    .input(z.object({ registrationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const registration = await ctx.db.courseRegistration.findUnique({
        where: { id: input.registrationId },
        include: {
          participants: true,
          invoices: { select: { status: true } },
          course: {
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
              createdById: true,
            },
          },
        },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registration not found",
        });
      }

      const { allowed } = await userCanManageSiblingDiscount(
        ctx.db,
        ctx.session.user.id,
        registration.course,
        ctx.permissionCache,
      );
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Keine Berechtigung, den Geschwisterkindrabatt zu entfernen",
        });
      }

      if (
        !registration.siblingDiscountApplied &&
        registration.siblingDiscountStatus === SiblingDiscountStatus.NONE
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Für diese Anmeldung ist kein Geschwisterkindrabatt vermerkt",
        });
      }

      // Wie beim Gewähren: hinter einer veröffentlichten Rechnung darf sich der
      // Preis nicht mehr still ändern.
      if (
        registration.invoices.some(
          (invoice) => invoice.status === InvoiceStatus.PUBLISHED,
        )
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Für diese Anmeldung wurde bereits eine Rechnung veröffentlicht",
        });
      }

      const previousStatus = registration.siblingDiscountStatus;
      const originalPrice =
        registration.originalTotalPrice ?? registration.totalPrice;

      const updated = await ctx.db.courseRegistration.update({
        where: { id: input.registrationId },
        data: {
          siblingDiscountApplied: false,
          siblingDiscountStatus: SiblingDiscountStatus.NONE,
          siblingDiscountAmount: null,
          originalTotalPrice: null,
          totalPrice: originalPrice,
        },
        include: {
          participants: true,
          course: {
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      });

      void logAudit(ctx.db, {
        actorId: ctx.session.user.id,
        actorEmail: ctx.session.user.email,
        action: "registration.sibling_discount_removed",
        entityType: "registration",
        entityId: updated.id,
        details: {
          courseId: registration.course.id,
          previousStatus,
          previousDiscountAmount: registration.siblingDiscountAmount,
          totalPrice: originalPrice,
        },
      });

      // Nur ein bereits gewährter Rabatt war dem Anmelder zugesagt — wird der
      // zurückgenommen, ändert sich sein Preis und er muss es erfahren. Ein
      // anhängiger Antrag war noch keine Zusage.
      if (previousStatus === SiblingDiscountStatus.APPROVED) {
        const emailService = await getEmailService();
        if (emailService.isEmailConfigured()) {
          try {
            await emailService.sendSiblingDiscountRejectedEmail(
              updated.registrantEmail,
              updated.registrantFirstName,
              updated.registrantLastName,
              updated.course.title,
              updated.course.startDate,
              updated.course.endDate,
              originalPrice,
              updated.participants.length,
              updated.id,
              registrationAccessUrl(updated),
            );
          } catch (error) {
            log.error("Failed to send discount removal email:", error);
          }
        }
      }

      return updated;
    }),

  confirmAtFullPrice: publicProcedure
    .input(
      z.object({
        registrationId: z.string(),
        /** Magic-link credential for registrants without an account. */
        accessToken: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const registration = await ctx.db.courseRegistration.findUnique({
        where: { id: input.registrationId },
        include: {
          course: true,
        },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registration not found",
        });
      }

      if (!isRegistrationOwner(ctx, registration, input.accessToken)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only confirm your own registrations",
        });
      }

      if (
        registration.siblingDiscountStatus !== SiblingDiscountStatus.REJECTED
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Registration does not have a rejected discount",
        });
      }

      // Aufgeteilt gilt die Zusage zum vollen Preis für alle abgelehnten
      // Teile. Der Status bleibt, wie er ist: früher wurde hier „bestätigt“
      // erzwungen, womit eine wartende Anmeldung den Kurs überbucht hätte.
      const parts = await siblingDiscountParts(
        ctx.db,
        registration,
        SiblingDiscountStatus.REJECTED,
      );
      const partIds = parts.map((part) => part.id);
      await ctx.db.courseRegistration.updateMany({
        where: { id: { in: partIds } },
        data: {
          siblingDiscountStatus: SiblingDiscountStatus.NONE,
          siblingDiscountApplied: false,
          siblingDiscountAmount: null,
          originalTotalPrice: null,
        },
      });
      const updatedParts = await ctx.db.courseRegistration.findMany({
        where: { id: { in: partIds } },
        include: {
          participants: true,
          course: {
            select: {
              title: true,
              startDate: true,
              endDate: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      // Eine Bestätigung bekommt nur, was tatsächlich einen Platz hat.
      const emailService = await getEmailService();
      if (emailService.isEmailConfigured()) {
        for (const part of updatedParts) {
          if (part.registrationStatus !== RegistrationStatus.CONFIRMED) {
            continue;
          }
          try {
            await emailService.sendCourseRegistrationConfirmedEmail(
              part.registrantEmail,
              part.registrantFirstName,
              part.registrantLastName,
              part.course.title,
              part.course.startDate,
              part.course.endDate,
              part.totalPrice,
              part.participants.length,
              part.id,
              registrationAccessUrl(part),
              downPaymentMailInfo(part, registration.course),
            );
          } catch (error) {
            log.error("Failed to send confirmation email:", error);
          }
        }
      }

      return ctx.db.courseRegistration.findUniqueOrThrow({
        where: { id: input.registrationId },
        include: {
          participants: true,
          course: {
            select: {
              title: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      });
    }),
});
