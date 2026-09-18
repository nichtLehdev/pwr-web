import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import {
  CourseCollaboratorRole,
  DownPaymentStatus,
  RegistrationStatus,
  SiblingDiscountStatus,
  type Prisma,
} from "~/generated/prisma/client";
import type { db as database } from "@/server/db";
import {
  assertSeatSelectionFits,
  countConfirmedParticipants,
  loadSeatAvailability,
  runSerializable,
} from "./course-capacity";
import { otherPartParticipants } from "./registration-group";
import {
  isRegistrationOwner,
  registrationAccessUrl,
  viewerId,
} from "./registration-access";
import { userHasPermission } from "./permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { createNotification } from "./notifications";
import { CLEARED_PROMOTION_OFFER } from "./waitlist-promotion";
import { downPaymentMailInfo } from "@/server/email/down-payment";
import { resolveParticipantPriceOption } from "@/lib/course-price-options";
import {
  downPaymentReceived,
  registrationDownPayment,
} from "@/lib/course-down-payment";
import { partPricing, type PartPricing } from "@/lib/registration-split";
import { usableSeats, withSeatsTaken } from "@/lib/waitlist-offer";

import { createLogger } from "@/server/utils/logger";

const log = createLogger("Waitlist Offers");

type Db = typeof database;
type Tx = Prisma.TransactionClient;

/**
 * Auf ein Nachrück-Angebot antworten dürfen die Anmeldenden — angemeldet oder
 * über den Zugangslink — und das Kursteam.
 */
export async function assertMayAnswerPromotionOffer(
  ctx: {
    db: Db;
    headers: Headers;
    session?: { user: { id: string; email: string } } | null;
    permissionCache: Parameters<typeof userHasPermission>[2];
  },
  registrationId: string,
  accessToken: string | undefined,
): Promise<void> {
  const userId = viewerId(ctx);
  const registration = await ctx.db.courseRegistration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      registrantEmail: true,
      course: {
        select: {
          createdById: true,
          // Magic-link callers have no account: a filter that matches nothing.
          collaborators: {
            where: { userId: userId ?? "" },
            select: { role: true },
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
  if (isRegistrationOwner(ctx, registration, accessToken)) return;

  const isStaff =
    userId !== null &&
    (registration.course.createdById === userId ||
      registration.course.collaborators.length > 0 ||
      (await userHasPermission(
        userId,
        PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
        ctx.permissionCache,
      )));
  if (!isStaff) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Auf dieses Angebot können nur die Anmeldenden oder das Kursteam antworten.",
    });
  }
}

const OFFER_GONE_MESSAGE =
  "Dieses Angebot gilt nicht mehr – es wurde bereits beantwortet oder ist abgelaufen.";

const offerCourseSelect = {
  id: true,
  title: true,
  startDate: true,
  endDate: true,
  createdById: true,
  maxParticipants: true,
  allowSiblingDiscount: true,
  courseNumber: true,
  downPaymentMode: true,
  downPaymentAmount: true,
  downPaymentRefundPolicy: true,
  downPaymentRefundText: true,
  priceOptions: {
    select: {
      id: true,
      label: true,
      price: true,
      maxParticipants: true,
      downPaymentAmount: true,
    },
  },
} satisfies Prisma.CourseSelect;

async function loadOfferedRegistration(
  tx: Tx,
  registrationId: string,
  now: Date,
) {
  const registration = await tx.courseRegistration.findUnique({
    where: { id: registrationId },
    include: {
      participants: { orderBy: { createdAt: "asc" } },
      course: { select: offerCourseSelect },
    },
  });
  if (!registration) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Registration not found",
    });
  }
  if (
    registration.registrationStatus !== RegistrationStatus.WAITLIST ||
    !registration.promotionOfferExpiresAt ||
    registration.promotionOfferExpiresAt <= now
  ) {
    throw new TRPCError({ code: "BAD_REQUEST", message: OFFER_GONE_MESSAGE });
  }
  return registration;
}

/** In-App-Hinweis ans Kursteam (Ersteller und Organisation). */
async function notifyCourseTeam(
  db: Db,
  args: {
    courseId: string;
    courseCreatedById: string | null;
    /** Wer selbst geantwortet hat, braucht keinen Hinweis darauf. */
    actorId: string | null;
    title: string;
    body: string;
    url: string;
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
    const recipients = new Set(organizers.map((o) => o.userId));
    if (args.courseCreatedById) recipients.add(args.courseCreatedById);
    if (args.actorId) recipients.delete(args.actorId);
    for (const userId of recipients) {
      await createNotification(db, userId, {
        type: "registration.promotion_offer",
        title: args.title,
        body: args.body,
        url: args.url,
      });
    }
  } catch (error) {
    log.error("Failed to notify course team:", error);
  }
}

export type AcceptedOffer = {
  courseId: string;
  confirmedRegistrationId: string;
  /** Die weiter wartenden Teilnehmer, wenn nicht alle nachgerückt sind. */
  waitlistRegistrationId: string | null;
};

/**
 * Nachrück-Angebot annehmen: die gewählten Teilnehmer rücken nach. Sind es
 * alle, wird die Anmeldung bestätigt. Sonst werden sie — wie beim Aufteilen
 * während der Anmeldung — eine eigene, bestätigte Anmeldung derselben Gruppe,
 * und die übrigen warten weiter, auf ihrem bisherigen Platz.
 */
export async function acceptPromotionOffer(
  db: Db,
  {
    registrationId,
    participantIds,
    actorId,
  }: {
    registrationId: string;
    participantIds: string[];
    actorId: string | null;
  },
): Promise<AcceptedOffer> {
  const accepted = await runSerializable(db, async (tx) => {
    const now = new Date();
    const registration = await loadOfferedRegistration(tx, registrationId, now);
    const { course } = registration;

    const chosen = new Set(participantIds);
    if (
      chosen.size === 0 ||
      chosen.size !== participantIds.length ||
      participantIds.some(
        (id) => !registration.participants.some((p) => p.id === id),
      )
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Bitte wählen Sie mindestens einen Teilnehmer dieser Anmeldung.",
      });
    }

    // Altbestand ohne gespeicherte id wird über ein eindeutiges Label zugeordnet.
    const participants = registration.participants.map((participant) => ({
      ...participant,
      priceOptionId:
        participant.priceOptionId ??
        resolveParticipantPriceOption(participant, course.priceOptions)?.id ??
        null,
    }));
    const selectedIndexes = participants.flatMap((p, index) =>
      chosen.has(p.id) ? [index] : [],
    );
    const restIndexes = participants.flatMap((p, index) =>
      chosen.has(p.id) ? [] : [index],
    );

    await assertSeatSelectionFits(tx, {
      course,
      participants: participants.map((p) => ({
        priceOptionId: p.priceOptionId ?? "",
      })),
      selection: selectedIndexes,
      confirmedCount: await countConfirmedParticipants(tx, course.id),
    });

    if (restIndexes.length === 0) {
      await tx.courseRegistration.update({
        where: { id: registration.id },
        data: {
          registrationStatus: RegistrationStatus.CONFIRMED,
          ...CLEARED_PROMOTION_OFFER,
        },
      });
      return {
        registration,
        result: {
          courseId: course.id,
          confirmedRegistrationId: registration.id,
          waitlistRegistrationId: null,
        },
        confirmedCount: participants.length,
        waitingCount: 0,
      };
    }

    const availability = await loadSeatAvailability(tx, course);
    const priceOf = (participant: { priceOptionId: string | null }) =>
      course.priceOptions.find((o) => o.id === participant.priceOptionId)
        ?.price ?? 0;
    const priced = participants.map((p) => ({
      birthDate: p.birthDate,
      siblingGroupId: p.siblingGroupId,
      price: priceOf(p),
    }));
    const otherParts = (await otherPartParticipants(tx, registration)).map(
      (p) => ({
        birthDate: p.birthDate,
        siblingGroupId: p.siblingGroupId,
        price: priceOf(p),
      }),
    );
    // Ein abgelehnter Rabatt bleibt abgelehnt; berechnet wird nur ein
    // beantragter oder genehmigter.
    const discountActive =
      registration.siblingDiscountApplied &&
      course.allowSiblingDiscount &&
      (registration.siblingDiscountStatus === SiblingDiscountStatus.PENDING ||
        registration.siblingDiscountStatus === SiblingDiscountStatus.APPROVED);
    const priceData = (indexes: number[]) => {
      const part: PartPricing = partPricing(priced, indexes, {
        withSiblingDiscount: discountActive,
        otherParticipants: otherParts,
      });
      const discounted = part.siblingDiscountAmount > 0;
      return {
        totalPrice: part.totalPrice,
        originalTotalPrice: discounted ? part.originalTotalPrice : null,
        siblingDiscountAmount: discounted ? part.siblingDiscountAmount : null,
        siblingDiscountStatus: discounted
          ? registration.siblingDiscountStatus
          : registration.siblingDiscountStatus ===
              SiblingDiscountStatus.REJECTED
            ? SiblingDiscountStatus.REJECTED
            : SiblingDiscountStatus.NONE,
      };
    };

    const selected = selectedIndexes.map((index) => participants[index]!);
    const rest = restIndexes.map((index) => participants[index]!);
    const confirmedDownPayment = registrationDownPayment(course, selected);
    const waitlistDownPayment = registrationDownPayment(course, rest);

    // Eine schon eingegangene Anzahlung (etwa vom Team mit der Anmeldung
    // verbucht) geht mit zum bestätigten Teil, wo sie fällig ist — sofern dort
    // eine anfällt; sonst bleibt sie, wo sie war.
    const received = downPaymentReceived(registration);
    const bookingMoves = received > 0 && confirmedDownPayment != null;

    const groupId = registration.registrationGroupId ?? randomUUID();

    const confirmed = await tx.courseRegistration.create({
      data: {
        courseId: registration.courseId,
        registrantId: registration.registrantId,
        registrantFirstName: registration.registrantFirstName,
        registrantLastName: registration.registrantLastName,
        registrantEmail: registration.registrantEmail,
        registrantPhone: registration.registrantPhone,
        registrantStreet: registration.registrantStreet,
        registrantZipCode: registration.registrantZipCode,
        registrantCity: registration.registrantCity,
        useSeparateBilling: registration.useSeparateBilling,
        billingCompany: registration.billingCompany,
        billingFirstName: registration.billingFirstName,
        billingLastName: registration.billingLastName,
        billingStreet: registration.billingStreet,
        billingZipCode: registration.billingZipCode,
        billingCity: registration.billingCity,
        billingEmail: registration.billingEmail,
        paymentMethod: registration.paymentMethod,
        notes: registration.notes,
        siblingDiscountApplied: registration.siblingDiscountApplied,
        ...priceData(selectedIndexes),
        registrationStatus: RegistrationStatus.CONFIRMED,
        registrationGroupId: groupId,
        downPaymentAmount: confirmedDownPayment,
        ...(bookingMoves
          ? {
              downPaymentStatus: registration.downPaymentStatus,
              downPaymentPaidAt: registration.downPaymentPaidAt,
              downPaymentPaidById: registration.downPaymentPaidById,
              downPaymentPaidAmount: received,
              downPaymentNote: registration.downPaymentNote,
            }
          : {
              downPaymentStatus: confirmedDownPayment
                ? DownPaymentStatus.OPEN
                : null,
            }),
      },
    });

    await tx.participant.updateMany({
      where: { id: { in: selected.map((p) => p.id) } },
      data: { registrationId: confirmed.id },
    });

    // Weniger gewählt, als Plätze nutzbar waren: den Rest geben die übrigen
    // Teilnehmer weiter — beim nächsten Nachrücken sind die Nächsten dran.
    const leftover = usableSeats(
      rest.map((p) => p.priceOptionId),
      withSeatsTaken(
        availability,
        selected.map((p) => p.priceOptionId),
      ),
    );

    await tx.courseRegistration.update({
      where: { id: registration.id },
      data: {
        ...priceData(restIndexes),
        registrationGroupId: groupId,
        ...CLEARED_PROMOTION_OFFER,
        promotionOfferPassedSeats: leftover > 0 ? leftover : null,
        ...(bookingMoves
          ? {
              downPaymentAmount: waitlistDownPayment,
              downPaymentStatus: waitlistDownPayment
                ? DownPaymentStatus.OPEN
                : null,
              downPaymentPaidAt: null,
              downPaymentPaidById: null,
              downPaymentPaidAmount: null,
              downPaymentNote: null,
            }
          : received > 0
            ? {
                downPaymentAmount:
                  waitlistDownPayment ?? registration.downPaymentAmount,
                downPaymentPaidAmount: received,
              }
            : {
                downPaymentAmount: waitlistDownPayment,
                downPaymentStatus: waitlistDownPayment
                  ? DownPaymentStatus.OPEN
                  : null,
              }),
      },
    });

    return {
      registration,
      result: {
        courseId: course.id,
        confirmedRegistrationId: confirmed.id,
        waitlistRegistrationId: registration.id,
      },
      confirmedCount: selected.length,
      waitingCount: rest.length,
    };
  });

  const { registration, result } = accepted;
  await sendConfirmationEmail(db, result.confirmedRegistrationId);

  await notifyCourseTeam(db, {
    courseId: result.courseId,
    courseCreatedById: registration.course.createdById,
    actorId,
    title: `Nachrück-Angebot angenommen: ${registration.course.title}`,
    body: `${registration.registrantFirstName} ${registration.registrantLastName} — ${accepted.confirmedCount} bestätigt${accepted.waitingCount > 0 ? `, ${accepted.waitingCount} weiter auf der Warteliste` : ""}`,
    url: `/dashboard/courses/${result.courseId}/participants/${result.confirmedRegistrationId}`,
  });

  // Nicht alle Plätze genutzt? Sie gelten als weitergegeben
  // (`promotionOfferPassedSeats`), bleiben aber frei, bis das Kursteam die
  // Warteliste nachrücken lässt — automatisch rückt niemand mehr nach.
  return result;
}

/**
 * Nachrück-Angebot ablehnen: die Anmeldung wartet weiter auf ihrem Platz. Die
 * Plätze gelten als weitergegeben; an die Nächsten gehen sie erst, wenn das
 * Kursteam die Warteliste nachrücken lässt.
 */
export async function declinePromotionOffer(
  db: Db,
  {
    registrationId,
    actorId,
  }: { registrationId: string; actorId: string | null },
): Promise<void> {
  const registration = await runSerializable(db, async (tx) => {
    const registration = await loadOfferedRegistration(
      tx,
      registrationId,
      new Date(),
    );
    const { course } = registration;
    const availability = await loadSeatAvailability(tx, course);
    await tx.courseRegistration.update({
      where: { id: registration.id },
      data: {
        ...CLEARED_PROMOTION_OFFER,
        promotionOfferPassedSeats: usableSeats(
          registration.participants.map(
            (p) => resolveParticipantPriceOption(p, course.priceOptions)?.id,
          ),
          availability,
        ),
      },
    });
    return registration;
  });

  await notifyCourseTeam(db, {
    courseId: registration.course.id,
    courseCreatedById: registration.course.createdById,
    actorId,
    title: `Nachrück-Angebot abgelehnt: ${registration.course.title}`,
    body: `${registration.registrantFirstName} ${registration.registrantLastName} — bleibt mit ${registration.participants.length} Teilnehmern auf der Warteliste`,
    url: `/dashboard/courses/${registration.course.id}/participants/${registration.id}`,
  });
}

/** Bestätigung für die nachgerückten Teilnehmer, mit fälliger Anzahlung. */
async function sendConfirmationEmail(
  db: Db,
  registrationId: string,
): Promise<void> {
  try {
    const emailService = await import("@/server/email");
    if (!emailService.isEmailConfigured()) return;

    const registration = await db.courseRegistration.findUniqueOrThrow({
      where: { id: registrationId },
      include: {
        participants: { select: { id: true } },
        course: {
          select: {
            title: true,
            startDate: true,
            endDate: true,
            courseNumber: true,
            downPaymentRefundPolicy: true,
            downPaymentRefundText: true,
          },
        },
      },
    });
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
      downPaymentMailInfo(registration, registration.course),
    );
  } catch (error) {
    log.error(`Failed to send confirmation for ${registrationId}:`, error);
  }
}
