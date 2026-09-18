import { RegistrationStatus, type Prisma } from "~/generated/prisma/client";
import type { db as database } from "@/server/db";
import { loadSeatAvailability, runSerializable } from "./course-capacity";
import { registrationAccessUrl } from "./registration-access";
import {
  downPaymentMailInfo,
  type DownPaymentMailInfo,
} from "@/server/email/down-payment";
import { resolveParticipantPriceOption } from "@/lib/course-price-options";
import {
  expiredOfferClosures,
  planPromotion,
  promotionOfferDeadline,
  type PromotionHaltSummary,
  type WaitingRegistration,
} from "@/lib/waitlist-offer";

import { createLogger } from "@/server/utils/logger";

const log = createLogger("Waitlist");

type Db = typeof database;
type Tx = Prisma.TransactionClient;

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

/** Was ein Durchgang an Post auslöst. */
export type PromotionMails = {
  promoted: PromotedRegistration[];
  offered: OfferedRegistration[];
  expired: ExpiredOffer[];
};

export type PromotionResult = PromotionMails & {
  /** Warum danach niemand (mehr) nachgerückt ist. */
  halt: PromotionHaltSummary;
};

const promotionCourseSelect = {
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
} satisfies Prisma.CourseSelect;

type PromotionCourse = Prisma.CourseGetPayload<{
  select: typeof promotionCourseSelect;
}>;

const waitingParticipantsInclude = {
  participants: {
    select: {
      firstName: true,
      lastName: true,
      priceOptionId: true,
      priceOption: true,
    },
  },
} satisfies Prisma.CourseRegistrationInclude;

type WaitlistEntry = Prisma.CourseRegistrationGetPayload<{
  include: typeof waitingParticipantsInclude;
}>;

/** Wartende Anmeldungen eines Kurses in Anmeldereihenfolge. */
function loadWaitlist(
  tx: Tx,
  courseId: string,
  where: Prisma.CourseRegistrationWhereInput = {},
): Promise<WaitlistEntry[]> {
  return tx.courseRegistration.findMany({
    where: {
      ...where,
      courseId,
      registrationStatus: RegistrationStatus.WAITLIST,
    },
    orderBy: { createdAt: "asc" },
    include: waitingParticipantsInclude,
  });
}

function asWaiting(
  registration: WaitlistEntry,
  course: PromotionCourse,
): WaitingRegistration {
  return {
    id: registration.id,
    participantPriceOptionIds: registration.participants.map(
      (participant) =>
        resolveParticipantPriceOption(participant, course.priceOptions)?.id,
    ),
    offerExpiresAt: registration.promotionOfferExpiresAt,
    passedSeats: registration.promotionOfferPassedSeats,
  };
}

function mailBase(
  registration: WaitlistEntry,
  course: PromotionCourse,
): RegistrationMailBase {
  return {
    id: registration.id,
    registrantEmail: registration.registrantEmail,
    registrantFirstName: registration.registrantFirstName,
    registrantLastName: registration.registrantLastName,
    courseTitle: course.title,
    courseStartDate: course.startDate,
    courseEndDate: course.endDate,
  };
}

const participantNames = (registration: WaitlistEntry) =>
  registration.participants.map(
    (participant) => `${participant.firstName} ${participant.lastName}`,
  );

const registrantName = (registration: WaitlistEntry) =>
  `${registration.registrantFirstName} ${registration.registrantLastName}`;

/** Schließt die abgelaufenen Angebote eines Kurses innerhalb von `tx`. */
async function closeExpiredOffersIn(
  tx: Tx,
  course: PromotionCourse,
  now: Date,
): Promise<ExpiredOffer[]> {
  const expired = await loadWaitlist(tx, course.id, {
    promotionOfferExpiresAt: { lte: now },
  });
  if (expired.length === 0) return [];

  const closures = expiredOfferClosures(
    expired.map((registration) => asWaiting(registration, course)),
    await loadSeatAvailability(tx, course),
    now,
  );

  const mails: ExpiredOffer[] = [];
  for (const closure of closures) {
    const registration = expired.find((r) => r.id === closure.id)!;
    await tx.courseRegistration.update({
      where: { id: closure.id },
      data: {
        ...CLEARED_PROMOTION_OFFER,
        promotionOfferPassedSeats: closure.passedSeats,
      },
    });
    mails.push({
      ...mailBase(registration, course),
      participantNames: participantNames(registration),
    });
  }
  return mails;
}

/**
 * Schließt die abgelaufenen Nachrück-Angebote eines Kurses — und tut sonst
 * nichts.
 *
 * Die Plätze, die die Anmeldung jetzt nutzen könnte, gelten als weitergegeben.
 * Früher rückte damit sofort die Nächste nach; seit das Kursteam das
 * Nachrücken selbst auslöst, bleiben die Plätze frei, bis es das tut. Der
 * stündliche Lauf ruft dies auf, `promoteFromWaitlist` vor jedem Durchgang —
 * beide nach derselben Regel. Die Ablauf-Mails verschickt
 * `sendPromotionEmails` mit `{ expired }`.
 */
export async function closeExpiredPromotionOffers(
  db: Db,
  courseId: string,
  now = new Date(),
): Promise<ExpiredOffer[]> {
  return runSerializable(db, async (tx) => {
    const course = await tx.course.findUnique({
      where: { id: courseId },
      select: promotionCourseSelect,
    });
    if (!course) return [];
    return closeExpiredOffersIn(tx, course, now);
  });
}

/**
 * Lässt die Warteliste eines Kurses nachrücken — nur auf Knopfdruck des
 * Kursteams (`registrations.promoteWaitlist`). Stornieren, Löschen, ein
 * Statuswechsel oder ein beantwortetes Angebot lösen es nicht mehr aus: frei
 * werdende Plätze sind oft nur kurz frei (siehe `@/lib/waitlist-offer`).
 * Streng nach Anmeldezeit:
 *
 * - Eine Anmeldung, die ganz passt, wird bestätigt; die Nächste folgt.
 * - Passt nur ein Teil, bekommt sie ein Angebot — die Anmeldenden wählen, wer
 *   nachrückt — und die Warteliste wartet auf die Antwort, höchstens sieben
 *   Tage.
 * - Wer ein Angebot über so viele Plätze schon abgelehnt oder verstreichen
 *   lassen hat, wird übersprungen und behält seinen Platz.
 * - Passt von einer Anmeldung niemand (etwa weil ihre Kategorie voll ist),
 *   hält die Warteliste dort an, damit eine große Familie nicht von kleineren
 *   Gruppen überholt wird.
 *
 * Abgelaufene Angebote werden vorher geschlossen. Läuft in einer eigenen
 * SERIALIZABLE-Transaktion; die Mails gehen nach dem Commit hinaus —
 * `sendPromotionEmails` mit dem Ergebnis aufrufen.
 */
export async function promoteFromWaitlist(
  db: Db,
  courseId: string,
): Promise<PromotionResult> {
  return runSerializable(db, async (tx) => {
    const idle = (halt: PromotionHaltSummary): PromotionResult => ({
      promoted: [],
      offered: [],
      expired: [],
      halt,
    });

    const course = await tx.course.findUnique({
      where: { id: courseId },
      select: promotionCourseSelect,
    });
    if (!course || !course.allowWaitingList) {
      return idle({ kind: "waiting_list_disabled" });
    }
    // No point confirming people into a course that already started.
    const now = new Date();
    if (course.startDate <= now) return idle({ kind: "course_started" });

    const expired = await closeExpiredOffersIn(tx, course, now);
    const waitlist = await loadWaitlist(tx, courseId);
    // Note: for unlimited courses the free seats are Infinity and every
    // waitlisted registration fits.
    const plan = planPromotion(
      waitlist.map((registration) => asWaiting(registration, course)),
      await loadSeatAvailability(tx, course),
      now,
    );
    const byId = new Map(waitlist.map((r) => [r.id, r]));
    const result: PromotionResult = idle({ kind: "nobody_waiting" });
    result.expired = expired;

    for (const id of plan.confirm) {
      const registration = byId.get(id)!;
      await tx.courseRegistration.update({
        where: { id },
        data: {
          registrationStatus: RegistrationStatus.CONFIRMED,
          ...CLEARED_PROMOTION_OFFER,
        },
      });
      result.promoted.push({
        ...mailBase(registration, course),
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
    }

    if (plan.offer) {
      const registration = byId.get(plan.offer.id)!;
      const expiresAt = promotionOfferDeadline(now, course.startDate);
      await tx.courseRegistration.update({
        where: { id: registration.id },
        data: {
          ...CLEARED_PROMOTION_OFFER,
          promotionOfferExpiresAt: expiresAt,
        },
      });
      result.offered.push({
        ...mailBase(registration, course),
        participantNames: participantNames(registration),
        seats: plan.offer.seats,
        expiresAt,
        hasDownPayment: !!registration.downPaymentAmount,
      });
    }

    const { halt } = plan;
    switch (halt.kind) {
      case "offer_running": {
        const registration = byId.get(halt.registrationId)!;
        result.halt = {
          kind: "offer_running",
          registrantName: registrantName(registration),
          expiresAt: registration.promotionOfferExpiresAt!,
        };
        break;
      }
      case "does_not_fit":
      case "offered":
        result.halt = {
          kind: halt.kind,
          registrantName: registrantName(byId.get(halt.registrationId)!),
        };
        break;
      default:
        result.halt = halt;
    }

    return result;
  });
}

/** Send the e-mails for a promotion run (fire-and-forget). */
export async function sendPromotionEmails(
  result: PromotionMails,
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
