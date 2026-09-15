import "server-only";

import { db } from "@/server/db";
import { getBaseUrl } from "@/server/utils/get-base-url";
import {
  CourseCollaboratorRole,
  RegistrationStatus,
} from "~/generated/prisma/client";
import { loadSeatAvailability } from "@/server/api/helpers/course-capacity";
import {
  promoteFromWaitlist,
  sendPromotionEmails,
} from "@/server/api/helpers/waitlist-promotion";
import { resolveParticipantPriceOption } from "@/lib/course-price-options";
import {
  PROMOTION_OFFER_REMINDER_HOURS,
  promotionOfferReminderDue,
  usableSeats,
} from "@/lib/waitlist-offer";

import { createLogger } from "@/server/utils/logger";

const log = createLogger("Waitlist Offers");

export type WaitlistOfferRunResult = {
  /** Kurse, in denen ein abgelaufenes Angebot das Nachrücken angestoßen hat. */
  courses: number;
  expired: number;
  promoted: number;
  offered: number;
  reminded: number;
  errors: Array<{ id: string; error: string }>;
};

/**
 * Stündlicher Lauf für Nachrück-Angebote:
 *
 * 1. Abgelaufene Angebote: Nachrücken für den Kurs anstoßen — das schließt
 *    das Angebot, gibt die Plätze an die Nächsten weiter und verschickt die
 *    Mails.
 * 2. Angebote mit höchstens noch zwei Tagen: das Kursteam einmal erinnern.
 */
export async function processWaitlistPromotionOffers(
  now = new Date(),
): Promise<WaitlistOfferRunResult> {
  const result: WaitlistOfferRunResult = {
    courses: 0,
    expired: 0,
    promoted: 0,
    offered: 0,
    reminded: 0,
    errors: [],
  };

  const expiredCourses = await db.courseRegistration.findMany({
    where: {
      registrationStatus: RegistrationStatus.WAITLIST,
      promotionOfferExpiresAt: { lte: now },
      course: { startDate: { gt: now } },
    },
    select: { courseId: true },
    distinct: ["courseId"],
  });

  for (const { courseId } of expiredCourses) {
    try {
      const run = await promoteFromWaitlist(db, courseId);
      await sendPromotionEmails(run);
      result.courses += 1;
      result.expired += run.expired.length;
      result.promoted += run.promoted.length;
      result.offered += run.offered.length;
    } catch (error) {
      log.error(`Promotion run for course ${courseId} failed:`, error);
      result.errors.push({
        id: courseId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const expiring = await db.courseRegistration.findMany({
    where: {
      registrationStatus: RegistrationStatus.WAITLIST,
      promotionOfferReminderSentAt: null,
      promotionOfferExpiresAt: {
        gt: now,
        lte: new Date(
          now.getTime() + PROMOTION_OFFER_REMINDER_HOURS * 60 * 60 * 1000,
        ),
      },
    },
    include: {
      participants: {
        select: {
          firstName: true,
          lastName: true,
          priceOptionId: true,
          priceOption: true,
        },
      },
      course: {
        select: {
          id: true,
          title: true,
          maxParticipants: true,
          priceOptions: {
            select: { id: true, label: true, maxParticipants: true },
          },
          createdBy: { select: { email: true } },
          collaborators: {
            where: { role: CourseCollaboratorRole.ORGANIZER },
            select: { user: { select: { email: true } } },
          },
        },
      },
    },
  });

  if (expiring.length === 0) return result;

  const emailService = await import("@/server/email");
  // Ohne Mailversand bleibt die Erinnerung offen und geht beim nächsten Lauf.
  if (!emailService.isEmailConfigured()) return result;

  for (const registration of expiring) {
    const expiresAt = registration.promotionOfferExpiresAt;
    if (
      !expiresAt ||
      !promotionOfferReminderDue(
        {
          expiresAt,
          reminderSentAt: registration.promotionOfferReminderSentAt,
        },
        now,
      )
    ) {
      continue;
    }

    const { course } = registration;
    const recipients = [
      ...new Set(
        [
          course.createdBy?.email,
          ...course.collaborators.map((c) => c.user.email),
        ]
          .filter((email): email is string => !!email)
          .map((email) => email.trim().toLowerCase()),
      ),
    ];

    try {
      if (recipients.length > 0) {
        const availability = await loadSeatAvailability(db, course);
        await emailService.sendWaitlistPromotionOfferExpiringTeamEmail({
          recipients,
          courseTitle: course.title,
          registrantName: `${registration.registrantFirstName} ${registration.registrantLastName}`,
          participantNames: registration.participants.map(
            (p) => `${p.firstName} ${p.lastName}`,
          ),
          seats: usableSeats(
            registration.participants.map(
              (p) => resolveParticipantPriceOption(p, course.priceOptions)?.id,
            ),
            availability,
          ),
          expiresAt,
          dashboardUrl: `${getBaseUrl()}/dashboard/courses/${course.id}/participants/${registration.id}`,
        });
      }
      await db.courseRegistration.update({
        where: { id: registration.id },
        data: { promotionOfferReminderSentAt: now },
      });
      result.reminded += 1;
    } catch (error) {
      log.error(`Offer reminder for ${registration.id} failed:`, error);
      result.errors.push({
        id: registration.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}
