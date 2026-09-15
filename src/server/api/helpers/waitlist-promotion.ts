import { RegistrationStatus } from "~/generated/prisma/client";
import type { db as database } from "@/server/db";
import { loadSeatAvailability, runSerializable } from "./course-capacity";
import { registrationAccessUrl } from "./registration-access";
import {
  downPaymentMailInfo,
  type DownPaymentMailInfo,
} from "@/server/email/down-payment";
import { resolveParticipantPriceOption } from "@/lib/course-price-options";
import {
  decidePromotion,
  promotionOfferDeadline,
  usableSeats,
  withSeatsTaken,
} from "@/lib/waitlist-offer";

import { createLogger } from "@/server/utils/logger";

const log = createLogger("Waitlist");

type Db = typeof database;

/** Setzt ein Nachrück-Angebot vollständig zurück. */
export const CLEARED_PROMOTION_OFFER = {
  promotionOfferExpiresAt: null,
  promotionOfferReminderSentAt: null,
  promotionOfferPassedSeats: null,
} as const;

type RegistrationMailBase = {
  id: string;
  registrantEmail: string;
  registrantFirstName: string;
  registrantLastName: string;
  courseTitle: string;
  courseStartDate: Date;
  courseEndDate: Date;
};

type PromotedRegistration = RegistrationMailBase & {
  totalPrice: number;
  participantsCount: number;
  /** Mit der Platzbestätigung wird eine gespeicherte Anzahlung fällig. */
  downPayment: DownPaymentMailInfo | null;
};

type OfferedRegistration = RegistrationMailBase & {
  participantNames: string[];
  seats: number;
  expiresAt: Date;
  hasDownPayment: boolean;
};

type ExpiredOffer = RegistrationMailBase & { participantNames: string[] };

export type PromotionResult = {
  promoted: PromotedRegistration[];
  offered: OfferedRegistration[];
  expired: ExpiredOffer[];
};

/**
 * Promote waitlisted registrations after seats were freed (cancellation,
 * deletion, status change, an answered or expired offer). Strictly FIFO by
 * registration time:
 *
 * - A registration that fits completely is confirmed; the next one follows.
 * - One that fits only partly gets an offer — its registrants choose who
 *   moves up — and the queue waits until they answer, at most seven days.
 * - An offer that was declined or expired passes its seats on to the next in
 *   line; the registration keeps its place for when more seats free up.
 * - Nobody of a registration fits (e.g. its price option is full): the queue
 *   stops there, so a large family isn't starved by smaller groups.
 *
 * Offers past their deadline are closed here as well, so the cron job only
 * has to trigger a run. Runs in its own SERIALIZABLE transaction; e-mails go
 * out after the commit — call `sendPromotionEmails` with the result.
 */
export async function promoteFromWaitlist(
  db: Db,
  courseId: string,
): Promise<PromotionResult> {
  return runSerializable(db, async (tx) => {
    const result: PromotionResult = { promoted: [], offered: [], expired: [] };

    const course = await tx.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        courseNumber: true,
        downPaymentRefundPolicy: true,
        downPaymentRefundText: true,
        allowWaitingList: true,
        maxParticipants: true,
        priceOptions: {
          select: { id: true, label: true, maxParticipants: true },
        },
      },
    });
    if (!course || !course.allowWaitingList) return result;
    // No point confirming people into a course that already started.
    const now = new Date();
    if (course.startDate <= now) return result;

    const waitlist = await tx.courseRegistration.findMany({
      where: {
        courseId,
        registrationStatus: RegistrationStatus.WAITLIST,
      },
      orderBy: { createdAt: "asc" },
      include: {
        participants: {
          select: {
            firstName: true,
            lastName: true,
            priceOptionId: true,
            priceOption: true,
          },
        },
      },
    });
    if (waitlist.length === 0) return result;

    // Note: for unlimited courses the free seats are Infinity and every
    // waitlisted registration fits.
    let availability: ReturnType<typeof withSeatsTaken> =
      await loadSeatAvailability(tx, course);

    for (const registration of waitlist) {
      const priceOptionIds = registration.participants.map(
        (participant) =>
          resolveParticipantPriceOption(participant, course.priceOptions)?.id,
      );
      const mailBase: RegistrationMailBase = {
        id: registration.id,
        registrantEmail: registration.registrantEmail,
        registrantFirstName: registration.registrantFirstName,
        registrantLastName: registration.registrantLastName,
        courseTitle: course.title,
        courseStartDate: course.startDate,
        courseEndDate: course.endDate,
      };
      const participantNames = registration.participants.map(
        (participant) => `${participant.firstName} ${participant.lastName}`,
      );

      // Abgelaufen, aber noch nicht abgeschlossen: die Plätze, die jetzt
      // nutzbar wären, gelten als weitergegeben.
      let passedSeats = registration.promotionOfferPassedSeats;
      if (
        registration.promotionOfferExpiresAt &&
        registration.promotionOfferExpiresAt <= now
      ) {
        passedSeats = usableSeats(priceOptionIds, availability);
        await tx.courseRegistration.update({
          where: { id: registration.id },
          data: {
            ...CLEARED_PROMOTION_OFFER,
            promotionOfferPassedSeats: passedSeats,
          },
        });
        result.expired.push({ ...mailBase, participantNames });
      }

      const decision = decidePromotion(priceOptionIds, availability, {
        offerActive:
          !!registration.promotionOfferExpiresAt &&
          registration.promotionOfferExpiresAt > now,
        passedSeats,
      });

      if (decision.kind === "skip") continue;

      if (decision.kind === "confirm") {
        await tx.courseRegistration.update({
          where: { id: registration.id },
          data: {
            registrationStatus: RegistrationStatus.CONFIRMED,
            ...CLEARED_PROMOTION_OFFER,
          },
        });
        availability = withSeatsTaken(availability, priceOptionIds);
        result.promoted.push({
          ...mailBase,
          totalPrice: registration.totalPrice,
          participantsCount: registration.participants.length,
          downPayment: downPaymentMailInfo(
            {
              ...registration,
              registrationStatus: RegistrationStatus.CONFIRMED,
            },
            course,
          ),
        });
        continue;
      }

      if (decision.kind === "offer") {
        const expiresAt = promotionOfferDeadline(now, course.startDate);
        await tx.courseRegistration.update({
          where: { id: registration.id },
          data: {
            ...CLEARED_PROMOTION_OFFER,
            promotionOfferExpiresAt: expiresAt,
          },
        });
        result.offered.push({
          ...mailBase,
          participantNames,
          seats: decision.seats,
          expiresAt,
          hasDownPayment: !!registration.downPaymentAmount,
        });
      }

      // An offer, a running offer or a registration nobody of which fits:
      // everyone behind it keeps waiting.
      break;
    }

    return result;
  });
}

/** Send the e-mails for a promotion run (fire-and-forget). */
export async function sendPromotionEmails(
  result: PromotionResult,
): Promise<void> {
  const { promoted, offered, expired } = result;
  if (promoted.length + offered.length + expired.length === 0) return;
  try {
    const emailService = await import("@/server/email");
    if (!emailService.isEmailConfigured()) return;

    for (const registration of expired) {
      try {
        await emailService.sendWaitlistPromotionOfferExpiredEmail({
          email: registration.registrantEmail,
          registrantFirstName: registration.registrantFirstName,
          registrantLastName: registration.registrantLastName,
          courseTitle: registration.courseTitle,
          participantNames: registration.participantNames,
          manageUrl: registrationAccessUrl(registration),
        });
      } catch (error) {
        log.error(
          `Failed to send offer expiry email for ${registration.id}:`,
          error,
        );
      }
    }

    for (const registration of promoted) {
      try {
        await emailService.sendCourseRegistrationConfirmedEmail(
          registration.registrantEmail,
          registration.registrantFirstName,
          registration.registrantLastName,
          registration.courseTitle,
          registration.courseStartDate,
          registration.courseEndDate,
          registration.totalPrice,
          registration.participantsCount,
          registration.id,
          registrationAccessUrl(registration),
          registration.downPayment,
        );
      } catch (error) {
        log.error(
          `Failed to send waitlist promotion email for ${registration.id}:`,
          error,
        );
      }
    }

    for (const registration of offered) {
      try {
        await emailService.sendWaitlistPromotionOfferEmail({
          email: registration.registrantEmail,
          registrantFirstName: registration.registrantFirstName,
          registrantLastName: registration.registrantLastName,
          courseTitle: registration.courseTitle,
          startDate: registration.courseStartDate,
          endDate: registration.courseEndDate,
          participantNames: registration.participantNames,
          seats: registration.seats,
          expiresAt: registration.expiresAt,
          manageUrl: registrationAccessUrl(registration),
          hasDownPayment: registration.hasDownPayment,
        });
      } catch (error) {
        log.error(
          `Failed to send promotion offer email for ${registration.id}:`,
          error,
        );
      }
    }
  } catch (error) {
    log.error("Failed to send waitlist promotion emails:", error);
  }
}
