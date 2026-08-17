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
  PaymentStatus,
  RegistrationStatus,
  SiblingDiscountStatus,
} from "~/generated/prisma/client";
import type { Prisma } from "~/generated/prisma/client";
import type { db as database } from "@/server/db";
import { isExternalCourse } from "@/lib/course-external";
import { isRegistrationDeadlinePassed } from "@/lib/registration-deadline";

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
import { PERMISSIONS } from "@/lib/permissions";
import {
  permissionProcedure,
  permissionProcedureAny,
} from "../middleware/permissions";
import { computeSiblingDiscounts, roundMoney } from "@/lib/sibling-discount";
import {
  assertPriceTierCapacity,
  computeCourseCapacity,
  countConfirmedParticipants,
  runSerializable,
} from "../helpers/course-capacity";
import { logAudit } from "../helpers/audit";
import { createNotification } from "../helpers/notifications";
import {
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
}): Promise<void> {
  const {
    registration,
    registrationStatus,
    siblingDiscountStatus,
    originalTotalPrice,
    siblingDiscountAmount,
    totalPrice,
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
      );
    }
  } catch (error) {
    console.error("Failed to send registration email:", error);
  }
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
    for (const userId of recipients) {
      await createNotification(db, userId, {
        type: "registration.new",
        title: isWaitlisted
          ? `${prefix} (Warteliste): ${args.courseTitle}`
          : `${prefix}: ${args.courseTitle}`,
        body: `${args.registration.registrantFirstName} ${args.registration.registrantLastName} — ${participantCount} ${participantCount === 1 ? "Teilnehmer" : "Teilnehmer"}`,
        url: `/dashboard/courses/${args.courseId}/participants/${args.registration.id}`,
      });
    }
  } catch (error) {
    console.error("Failed to notify course team:", error);
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
        registrantPhone: z
          .string()
          .max(50)
          .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
          .optional(),
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        participants: participantsInput,
        paymentMethod: inputPaymentMethod,
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

      const { participants: participantsWithPriceOptions, originalTotalPrice } =
        prepareParticipantsForCourse(participantsInput, course);

      let totalPrice = originalTotalPrice;
      let siblingDiscountAmount = 0;
      let siblingDiscountStatus: SiblingDiscountStatus =
        SiblingDiscountStatus.NONE;

      if (input.siblingDiscountApplied && course.allowSiblingDiscount) {
        // Age eligibility is evaluated at course start, so the discount does
        // not change between registration and invoicing.
        const { totalDiscount } = computeSiblingDiscounts(
          participantsWithPriceOptions.map((p) => ({
            birthDate: p.birthDate,
            siblingGroupId: p.siblingGroupId,
            price:
              course.priceOptions.find((po) => po.id === p.priceOptionId)
                ?.price ?? 0,
          })),
          course.startDate,
        );
        siblingDiscountAmount = totalDiscount;

        if (siblingDiscountAmount > 0) {
          totalPrice = roundMoney(originalTotalPrice - siblingDiscountAmount);
          siblingDiscountStatus = SiblingDiscountStatus.PENDING;
        }
      }

      const resolvedPaymentMethod = resolveCoursePaymentMethod(
        course,
        inputPaymentMethod,
      );

      // Capacity check and insert run in one SERIALIZABLE transaction so two
      // concurrent registrations cannot both take the last seat.
      const { registration, registrationStatus } = await runSerializable(
        ctx.db,
        async (tx) => {
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

          // Per-price-tier limits are enforced here too (they previously were
          // only checked on registration updates, not on creation).
          if (status === RegistrationStatus.CONFIRMED) {
            const additionsByLabel: Record<string, number> = {};
            for (const participant of participantsWithPriceOptions) {
              additionsByLabel[participant.priceOption] =
                (additionsByLabel[participant.priceOption] ?? 0) + 1;
            }
            await assertPriceTierCapacity(
              tx,
              input.courseId,
              course.priceOptions,
              additionsByLabel,
            );
          }

          const created = await tx.courseRegistration.create({
            data: {
              ...registrationData,
              ...(resolvedPaymentMethod != null
                ? { paymentMethod: resolvedPaymentMethod }
                : {}),
              totalPrice, // Use server-calculated price (after discount if applied)
              originalTotalPrice:
                input.siblingDiscountApplied && siblingDiscountAmount > 0
                  ? originalTotalPrice
                  : null,
              siblingDiscountAmount:
                input.siblingDiscountApplied && siblingDiscountAmount > 0
                  ? siblingDiscountAmount
                  : null,
              siblingDiscountApplied: input.siblingDiscountApplied ?? false,
              siblingDiscountStatus,
              registrationStatus: status,
              participants: {
                create: participantsWithPriceOptions.map((participant) => {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { priceOptionId, ...participantData } = participant;
                  return {
                    ...participantData,
                    customFields: (participantData.customFields ||
                      {}) as Prisma.InputJsonValue,
                    siblingGroupId: participant.siblingGroupId || null,
                  };
                }),
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

          return { registration: created, registrationStatus: status };
        },
      );

      await sendRegistrationCreatedEmail({
        registration,
        registrationStatus,
        siblingDiscountStatus,
        originalTotalPrice,
        siblingDiscountAmount,
        totalPrice,
      });

      await notifyCourseTeamOfNewRegistration(ctx.db, {
        courseId: input.courseId,
        courseTitle: course.title,
        courseCreatedById: course.createdById,
        actorId: ctx.session?.user.id ?? null,
        registration,
        registrationStatus,
      });

      return registration;
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
        registrantPhone: z
          .string()
          .max(50)
          .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
          .optional(),
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
        paymentStatus: z
          .enum([PaymentStatus.PENDING, PaymentStatus.PAID])
          .default(PaymentStatus.PENDING),
        allowOverbooking: z.boolean().default(false),
        sendConfirmationEmail: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        participants: participantsInput,
        paymentMethod: inputPaymentMethod,
        registrationStatus: requestedStatus,
        paymentStatus,
        allowOverbooking,
        sendConfirmationEmail,
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

      const { participants: participantsWithPriceOptions, originalTotalPrice } =
        prepareParticipantsForCourse(participantsInput, course);

      let totalPrice = originalTotalPrice;
      let siblingDiscountAmount = 0;
      let siblingDiscountStatus: SiblingDiscountStatus =
        SiblingDiscountStatus.NONE;

      if (input.siblingDiscountApplied && course.allowSiblingDiscount) {
        const { totalDiscount } = computeSiblingDiscounts(
          participantsWithPriceOptions.map((p) => ({
            birthDate: p.birthDate,
            siblingGroupId: p.siblingGroupId,
            price:
              course.priceOptions.find((po) => po.id === p.priceOptionId)
                ?.price ?? 0,
          })),
          course.startDate,
        );
        siblingDiscountAmount = totalDiscount;

        if (siblingDiscountAmount > 0) {
          totalPrice = roundMoney(originalTotalPrice - siblingDiscountAmount);
          siblingDiscountStatus = SiblingDiscountStatus.PENDING;
        }
      }

      const resolvedPaymentMethod = resolveCoursePaymentMethod(
        course,
        inputPaymentMethod,
      );

      const { registration, registrationStatus } = await runSerializable(
        ctx.db,
        async (tx) => {
          const confirmedCount = await countConfirmedParticipants(
            tx,
            input.courseId,
          );
          const capacity = computeCourseCapacity(course);
          const newParticipants = participantsWithPriceOptions.length;
          const fitsInCapacity = confirmedCount + newParticipants <= capacity;

          const status: RegistrationStatus =
            requestedStatus ??
            (fitsInCapacity || !course.allowWaitingList
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
          if (status === RegistrationStatus.CONFIRMED && !allowOverbooking) {
            const additionsByLabel: Record<string, number> = {};
            for (const participant of participantsWithPriceOptions) {
              additionsByLabel[participant.priceOption] =
                (additionsByLabel[participant.priceOption] ?? 0) + 1;
            }
            await assertPriceTierCapacity(
              tx,
              input.courseId,
              course.priceOptions,
              additionsByLabel,
            );
          }

          const created = await tx.courseRegistration.create({
            data: {
              ...registrationData,
              ...(resolvedPaymentMethod != null
                ? { paymentMethod: resolvedPaymentMethod }
                : {}),
              totalPrice,
              originalTotalPrice:
                siblingDiscountAmount > 0 ? originalTotalPrice : null,
              siblingDiscountAmount:
                siblingDiscountAmount > 0 ? siblingDiscountAmount : null,
              siblingDiscountApplied: input.siblingDiscountApplied ?? false,
              siblingDiscountStatus,
              registrationStatus: status,
              paymentStatus,
              participants: {
                create: participantsWithPriceOptions.map((participant) => {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { priceOptionId, ...participantData } = participant;
                  return {
                    ...participantData,
                    customFields:
                      participantData.customFields as Prisma.InputJsonValue,
                    siblingGroupId: participant.siblingGroupId || null,
                  };
                }),
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

          return { registration: created, registrationStatus: status };
        },
      );

      if (sendConfirmationEmail) {
        await sendRegistrationCreatedEmail({
          registration,
          registrationStatus,
          siblingDiscountStatus,
          originalTotalPrice,
          siblingDiscountAmount,
          totalPrice,
        });
      }

      await notifyCourseTeamOfNewRegistration(ctx.db, {
        courseId: input.courseId,
        courseTitle: course.title,
        courseCreatedById: course.createdById,
        actorId: ctx.session.user.id,
        registration,
        registrationStatus,
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
          registrationStatus,
          paymentStatus,
          totalPrice,
          allowOverbooking,
          sendConfirmationEmail,
          afterDeadline: isRegistrationDeadlinePassed(
            course.registrationDeadline,
          ),
        },
      });

      return registration;
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
        console.error("Failed to send registration access links:", error);
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
              createdById: true,
              collaborators: collaboratorsForViewer(viewerId(ctx)),
              priceOptions: {
                select: {
                  id: true,
                  label: true,
                  price: true,
                  maxParticipants: true,
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

      if (!isOwner && !isCreator && !teamMember && !canManageRegistrations) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registration not found",
        });
      }

      const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        course: { createdById, collaborators, ...course },
        ...rest
      } = registration;
      return { ...rest, course };
    }),

  canManageRegistration: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const registration = await ctx.db.courseRegistration.findUnique({
        where: { id: input.id },
        include: {
          course: {
            select: {
              createdById: true,
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
      const canCancel = (isOwner || isStaff) && !isCancelled;

      return { canView, canEdit, canCancel, isStaff };
    }),

  /**
   * Cross-course registration overview for administrators: every
   * registration, filterable by registrant, status, payment, and course —
   * the "who owes money / who registered" view that per-course participant
   * pages can't answer.
   */
  getAllAdmin: permissionProcedure(PERMISSIONS.COURSES_MANAGE_REGISTRATIONS)
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(25),
        search: z.string().max(200).optional(),
        registrationStatus: z.nativeEnum(RegistrationStatus).optional(),
        paymentStatus: z.nativeEnum(PaymentStatus).optional(),
        courseId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const search = input.search?.trim();
      const where: Prisma.CourseRegistrationWhereInput = {
        ...(input.registrationStatus && {
          registrationStatus: input.registrationStatus,
        }),
        ...(input.paymentStatus && { paymentStatus: input.paymentStatus }),
        ...(input.courseId && { courseId: input.courseId }),
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
            paymentStatus: true,
            paymentMethod: true,
            totalPrice: true,
            invoiceId: true,
            createdAt: true,
            course: {
              select: { id: true, title: true, startDate: true },
            },
            _count: { select: { participants: true } },
          },
          orderBy: { createdAt: "desc" },
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
        registrantPhone: z
          .string()
          .max(50)
          .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
          .optional(),
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

      const {
        participants: participantsWithPriceOptions,
        originalTotalPrice: undiscountedTotalPrice,
      } = prepareParticipantsForCourse(participantsInput, course);

      let originalTotalPrice = undiscountedTotalPrice;
      let totalPrice = originalTotalPrice;
      let siblingDiscountAmount = 0;
      let siblingDiscountStatus = registration.siblingDiscountStatus;

      if (input.siblingDiscountApplied && course.allowSiblingDiscount) {
        const { totalDiscount } = computeSiblingDiscounts(
          participantsWithPriceOptions.map((p) => ({
            birthDate: p.birthDate,
            siblingGroupId: p.siblingGroupId,
            price:
              course.priceOptions.find((po) => po.id === p.priceOptionId)
                ?.price ?? 0,
          })),
          course.startDate,
        );
        siblingDiscountAmount = totalDiscount;

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

      // Capacity checks and the delete-and-rewrite of participants run in one
      // SERIALIZABLE transaction: no overbooking through concurrent edits, and
      // no half-rewritten participant list if anything fails midway.
      const updatedRegistration = await runSerializable(ctx.db, async (tx) => {
        const currentParticipantsExcludingThis =
          await countConfirmedParticipants(tx, course.id, id);

        const newTotalParticipants =
          currentParticipantsExcludingThis +
          participantsWithPriceOptions.length;
        const maxParticipants = computeCourseCapacity(course);

        if (newTotalParticipants > maxParticipants) {
          if (!course.allowWaitingList) {
            const availableSpots =
              maxParticipants - currentParticipantsExcludingThis;
            if (
              availableSpots > 0 &&
              availableSpots < participantsWithPriceOptions.length
            ) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Nur noch ${availableSpots} ${availableSpots === 1 ? "Platz" : "Plätze"} verfügbar, aber Sie versuchen ${participantsWithPriceOptions.length} ${participantsWithPriceOptions.length === 1 ? "Teilnehmer" : "Teilnehmer"} anzumelden. Bitte reduzieren Sie die Anzahl der Teilnehmer.`,
              });
            }
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Cannot add more participants - course is full",
            });
          }
        }

        const priceOptionCounts: Record<string, number> = {};
        for (const participant of participantsWithPriceOptions) {
          if (participant.priceOption) {
            priceOptionCounts[participant.priceOption] =
              (priceOptionCounts[participant.priceOption] ?? 0) + 1;
          }
        }
        await assertPriceTierCapacity(
          tx,
          course.id,
          course.priceOptions,
          priceOptionCounts,
          id,
        );

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
                select: { label: true, maxParticipants: true },
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
        }

        return tx.courseRegistration.update({
          where: { id: input.id },
          data: {
            registrationStatus: input.registrationStatus,
            notes: input.notes,
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
          );
        } catch (error) {
          console.error("Failed to send confirmation email:", error);
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

  updatePaymentStatus: permissionProcedureAny([
    PERMISSIONS.INVOICES_MANAGE,
    PERMISSIONS.REGISTRATIONS_MARK_PAID,
  ])
    .input(
      z.object({
        id: z.string(),
        paymentStatus: z.enum(PaymentStatus),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const registration = await ctx.db.courseRegistration.findUnique({
        where: { id: input.id },
        include: {
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

      const hasInvoicesManage = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.INVOICES_MANAGE,
        ctx.permissionCache,
      );
      if (!hasInvoicesManage && input.paymentStatus !== PaymentStatus.PAID) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Mit Ihrer Berechtigung können Sie nur „Bezahlt“ setzen. Andere Zahlungsstatus erfordern die Rechnungspflege-Berechtigung.",
        });
      }

      void logAudit(ctx.db, {
        actorId: ctx.session.user.id,
        actorEmail: ctx.session.user.email,
        action: "registration.payment_status",
        entityType: "registration",
        entityId: input.id,
        details: {
          paymentStatus: input.paymentStatus,
          previousPaymentStatus: registration.paymentStatus,
        },
      });

      // Invoice state lives on the Invoice model now — issuing or voiding a
      // document is the invoice router's job, and this mutation must not draw
      // a number of its own (that used to leave the registration pointing at a
      // number with no invoice behind it).
      return ctx.db.courseRegistration.update({
        where: { id: input.id },
        data: { paymentStatus: input.paymentStatus },
      });
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
          console.error("Failed to send cancellation email:", error);
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

      const paidCount = confirmed.filter(
        (r) => r.paymentStatus === PaymentStatus.PAID,
      ).length;
      const pendingPayment = confirmed.filter(
        (r) => r.paymentStatus === PaymentStatus.PENDING,
      ).length;

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
      };
    }),

  approveSiblingDiscount: permissionProcedure(
    PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
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
      const updated = await ctx.db.courseRegistration.update({
        where: { id: input.registrationId },
        data: {
          siblingDiscountStatus: SiblingDiscountStatus.APPROVED,
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
      if (
        emailService.isEmailConfigured() &&
        updated.originalTotalPrice &&
        updated.siblingDiscountAmount
      ) {
        try {
          await emailService.sendSiblingDiscountApprovedEmail(
            updated.registrantEmail,
            updated.registrantFirstName,
            updated.registrantLastName,
            updated.course.title,
            updated.course.startDate,
            updated.course.endDate,
            updated.originalTotalPrice,
            updated.siblingDiscountAmount,
            updated.totalPrice,
            updated.participants.length,
            updated.id,
            registrationAccessUrl(updated),
          );
        } catch (error) {
          console.error("Failed to send discount approval email:", error);
        }
      }

      return updated;
    }),

  rejectSiblingDiscount: permissionProcedure(
    PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
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

      const originalPrice =
        registration.originalTotalPrice ?? registration.totalPrice;
      const updated = await ctx.db.courseRegistration.update({
        where: { id: input.registrationId },
        data: {
          siblingDiscountStatus: SiblingDiscountStatus.REJECTED,
          totalPrice: originalPrice,
          siblingDiscountAmount: null,
          originalTotalPrice: null,
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
          console.error("Failed to send discount rejection email:", error);
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

      const updated = await ctx.db.courseRegistration.update({
        where: { id: input.registrationId },
        data: {
          siblingDiscountStatus: SiblingDiscountStatus.NONE,
          siblingDiscountApplied: false,
          siblingDiscountAmount: null,
          originalTotalPrice: null,
          registrationStatus: RegistrationStatus.CONFIRMED,
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
      if (emailService.isEmailConfigured()) {
        try {
          await emailService.sendCourseRegistrationConfirmedEmail(
            updated.registrantEmail,
            updated.registrantFirstName,
            updated.registrantLastName,
            updated.course.title,
            updated.course.startDate,
            updated.course.endDate,
            updated.totalPrice,
            updated.participants.length,
            updated.id,
            registrationAccessUrl(updated),
          );
        } catch (error) {
          console.error("Failed to send confirmation email:", error);
        }
      }

      return updated;
    }),
});
