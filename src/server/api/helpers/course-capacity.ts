import { Prisma, RegistrationStatus } from "~/generated/prisma/client";
import { TRPCError } from "@trpc/server";
import type { db as database } from "@/server/db";
import {
  SEAT_SELECTION_OUTDATED_MESSAGE,
  type SeatAvailability,
} from "@/lib/registration-split";
import { registrationSeatShortage } from "@/lib/registration-seat-shortage";
import { resolveParticipantPriceOption } from "@/lib/course-price-options";
import {
  seatsLeftForNewRegistrations,
  seatSummaryForNewRegistrations,
  WAITLIST_PRIORITY_SPLIT_MESSAGE,
} from "@/lib/waitlist-priority";
import { getCourseCapacitySummary } from "@/lib/course-available-slots";

type Db = typeof database;
type Tx = Prisma.TransactionClient;

export type CapacityCourse = {
  maxParticipants: number | null;
  priceOptions: Array<{ label: string; maxParticipants: number | null }>;
};

/**
 * Total seat capacity. Course-level maxParticipants always caps (0 means 0); if every
 * tier has a limit, their sum caps too. Infinity only without a course limit and with
 * an unlimited tier or no tiers at all.
 */
export function computeCourseCapacity(course: CapacityCourse): number {
  const limitedTiers = course.priceOptions.filter(
    (p) => p.maxParticipants != null,
  );
  const hasUnlimitedTier = course.priceOptions.some(
    (p) => p.maxParticipants == null,
  );
  const tierSum = limitedTiers.reduce(
    (sum, p) => sum + (p.maxParticipants ?? 0),
    0,
  );

  if (course.maxParticipants != null) {
    if (course.priceOptions.length === 0 || hasUnlimitedTier) {
      return course.maxParticipants;
    }
    return Math.min(course.maxParticipants, tierSum);
  }
  if (course.priceOptions.length > 0 && !hasUnlimitedTier) {
    return tierSum;
  }
  return Infinity;
}

/** Only CONFIRMED registrations occupy seats (not waitlisted, cancelled or pending-discount). */
export async function countConfirmedParticipants(
  db: Db | Tx,
  courseId: string,
  excludeRegistrationId?: string,
): Promise<number> {
  return db.participant.count({
    where: {
      registration: {
        courseId,
        registrationStatus: RegistrationStatus.CONFIRMED,
        ...(excludeRegistrationId
          ? { id: { not: excludeRegistrationId } }
          : {}),
      },
    },
  });
}

type TierPriceOption = {
  id: string;
  label: string;
  maxParticipants: number | null;
};

/** In Eingangsreihenfolge laden (`createdAt: "asc"`), sonst hängt die Reservierung von der DB ab. */
type WaitingParticipants = {
  participants: ReadonlyArray<{
    priceOptionId: string | null;
    priceOption: string | null;
  }>;
};

/**
 * Preiskategorie je wartendem Teilnehmer, als Eingabe für `@/lib/waitlist-priority`.
 * Ohne aktivierte Warteliste zählen WAITLIST-Anmeldungen nicht, sonst sperren sie neue für immer aus.
 */
export function waitlistSeatRequests(
  course: {
    allowWaitingList: boolean | null;
    priceOptions: ReadonlyArray<{ id: string; label: string }>;
  },
  waitlist: readonly WaitingParticipants[],
): Array<Array<string | undefined>> {
  if (!course.allowWaitingList) return [];
  return waitlist.map((registration) =>
    registration.participants.map(
      (participant) =>
        resolveParticipantPriceOption(participant, course.priceOptions)?.id,
    ),
  );
}

/** Für die öffentliche Platzübersicht: nur Status und Kategorien, nie Kontakt- oder Rechnungsdaten. */
export const seatRegistrationsQuery = {
  where: {
    registrationStatus: {
      in: [RegistrationStatus.CONFIRMED, RegistrationStatus.WAITLIST],
    },
  },
  orderBy: { createdAt: "asc" },
  select: {
    registrationStatus: true,
    participants: {
      orderBy: { createdAt: "asc" },
      select: { priceOptionId: true, priceOption: true },
    },
  },
} satisfies Prisma.CourseRegistrationFindManyArgs;

/**
 * Freie Plätze für neue Anmeldungen, ohne die, die Wartende nutzen könnten.
 * Erwartet mit {@link seatRegistrationsQuery} geladene Anmeldungen.
 */
export function seatSummaryForPublic(course: {
  maxParticipants: number | null;
  allowWaitingList: boolean | null;
  priceOptions: TierPriceOption[];
  registrations: ReadonlyArray<
    WaitingParticipants & { registrationStatus: RegistrationStatus }
  >;
}) {
  const confirmed = course.registrations.filter(
    (r) => r.registrationStatus === RegistrationStatus.CONFIRMED,
  );
  const waitlist = waitlistSeatRequests(
    course,
    course.registrations.filter(
      (r) => r.registrationStatus === RegistrationStatus.WAITLIST,
    ),
  );
  const summary = getCourseCapacitySummary({
    maxParticipants: course.maxParticipants,
    priceOptions: course.priceOptions,
    registrations: confirmed.map((r) => ({
      registrationStatus: r.registrationStatus,
      participants: [...r.participants],
    })),
  });
  return {
    ...seatSummaryForNewRegistrations(summary, course.priceOptions, waitlist),
    hasWaitingList: waitlist.length > 0,
  };
}

/**
 * {@link loadSeatAvailability} ohne die Plätze, die Wartende nutzen könnten.
 * Das Team vergibt weiterhin aus den tatsächlichen.
 */
export async function loadSeatsForNewRegistrations(
  db: Db | Tx,
  course: {
    id: string;
    maxParticipants: number | null;
    allowWaitingList: boolean | null;
    priceOptions: TierPriceOption[];
  },
): Promise<Awaited<ReturnType<typeof loadSeatAvailability>>> {
  const availability = await loadSeatAvailability(db, course);
  if (!course.allowWaitingList) return availability;
  const waitlist = await db.courseRegistration.findMany({
    where: {
      courseId: course.id,
      registrationStatus: RegistrationStatus.WAITLIST,
    },
    orderBy: { createdAt: "asc" },
    select: {
      participants: {
        orderBy: { createdAt: "asc" },
        select: { priceOptionId: true, priceOption: true },
      },
    },
  });
  return seatsLeftForNewRegistrations(
    availability,
    waitlistSeatRequests(course, waitlist),
  );
}

export function priceTierFullMessage(option: { label: string }): string {
  return `Die Preisoption "${option.label}" ist ausgebucht.`;
}

/**
 * Erste Preiskategorie, in die die neuen Teilnehmer nicht mehr passen, sonst `null`.
 * Zählt über `priceOptionId`, da Labels doppelt vorkommen dürfen; Teilnehmer ohne id
 * nur bei eindeutigem Label.
 */
export async function findFullPriceTier(
  db: Db | Tx,
  courseId: string,
  priceOptions: TierPriceOption[],
  additionsByOptionId: Record<string, number>,
  excludeRegistrationId?: string,
): Promise<TierPriceOption | null> {
  for (const [optionId, addition] of Object.entries(additionsByOptionId)) {
    const priceOption = priceOptions.find((p) => p.id === optionId);
    if (priceOption?.maxParticipants == null) continue;

    const currentCount = await countConfirmedInPriceOption(
      db,
      courseId,
      priceOption,
      priceOptions,
      excludeRegistrationId,
    );

    if (currentCount + addition > priceOption.maxParticipants) {
      return priceOption;
    }
  }
  return null;
}

/** Bestätigte Teilnehmer einer Kategorie, gezählt wie in {@link findFullPriceTier}. */
async function countConfirmedInPriceOption(
  db: Db | Tx,
  courseId: string,
  priceOption: TierPriceOption,
  priceOptions: TierPriceOption[],
  excludeRegistrationId?: string,
): Promise<number> {
  const labelIsUnique =
    priceOptions.filter((p) => p.label === priceOption.label).length === 1;

  return db.participant.count({
    where: {
      OR: [
        { priceOptionId: priceOption.id },
        ...(labelIsUnique
          ? [{ priceOptionId: null, priceOption: priceOption.label }]
          : []),
      ],
      registration: {
        courseId,
        registrationStatus: RegistrationStatus.CONFIRMED,
        ...(excludeRegistrationId
          ? { id: { not: excludeRegistrationId } }
          : {}),
      },
    },
  });
}

/**
 * Freie Plätze nach denselben Regeln wie die Prüfungen beim Bestätigen (Kategorien nach id,
 * nicht nach Label). Grundlage fürs Nachrücken.
 */
export async function loadSeatAvailability(
  db: Db | Tx,
  course: {
    id: string;
    maxParticipants: number | null;
    priceOptions: TierPriceOption[];
  },
): Promise<{
  availableSlots: number;
  priceOptions: TierPriceOption[];
  capacityByPriceOption: Record<string, number>;
}> {
  const confirmed = await countConfirmedParticipants(db, course.id);
  const capacityByPriceOption: Record<string, number> = {};
  for (const option of course.priceOptions) {
    if (option.maxParticipants == null) continue;
    const used = await countConfirmedInPriceOption(
      db,
      course.id,
      option,
      course.priceOptions,
    );
    capacityByPriceOption[option.id] = Math.max(
      0,
      option.maxParticipants - used,
    );
  }
  return {
    availableSlots: Math.max(0, computeCourseCapacity(course) - confirmed),
    priceOptions: course.priceOptions,
    capacityByPriceOption,
  };
}

/** Wie {@link findFullPriceTier}, lehnt eine volle Kategorie aber ab. */
export async function assertPriceTierCapacity(
  ...args: Parameters<typeof findFullPriceTier>
): Promise<void> {
  const fullOption = await findFullPriceTier(...args);
  if (fullOption) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: priceTierFullMessage(fullOption),
    });
  }
}

/**
 * Prüft beim Aufteilen, ob die gewählten Teilnehmer noch passen: die Plätze stammen vom
 * Laden der Seite und können inzwischen vergeben sein.
 */
export async function assertSeatSelectionFits(
  db: Db | Tx,
  {
    course,
    participants,
    selection,
    confirmedCount,
    seatsForNewRegistrations,
  }: {
    course: {
      id: string;
      maxParticipants: number | null;
      priceOptions: TierPriceOption[];
    };
    participants: ReadonlyArray<{ priceOptionId: string }>;
    selection: readonly number[];
    confirmedCount: number;
    /**
     * Nur bei neuen Anmeldungen ({@link loadSeatsForNewRegistrations}); fehlt beim
     * Annehmen eines Nachrück-Angebots, dort ist die Wartende dran.
     */
    seatsForNewRegistrations?: SeatAvailability;
  },
): Promise<void> {
  const outdated = () =>
    new TRPCError({
      code: "BAD_REQUEST",
      message: SEAT_SELECTION_OUTDATED_MESSAGE,
    });

  if (confirmedCount + selection.length > computeCourseCapacity(course)) {
    throw outdated();
  }

  const additionsByOptionId: Record<string, number> = {};
  for (const index of selection) {
    const optionId = participants[index]?.priceOptionId;
    if (optionId) {
      additionsByOptionId[optionId] = (additionsByOptionId[optionId] ?? 0) + 1;
    }
  }
  if (
    await findFullPriceTier(
      db,
      course.id,
      course.priceOptions,
      additionsByOptionId,
    )
  ) {
    throw outdated();
  }

  // Die Plätze sind frei, stehen aber zum Teil Wartenden zu: eine eigene
  // Meldung, weil „nicht mehr genug frei“ hier nicht stimmt.
  if (
    seatsForNewRegistrations &&
    registrationSeatShortage({
      participantPriceOptionIds: selection.map(
        (index) => participants[index]?.priceOptionId,
      ),
      ...seatsForNewRegistrations,
    })
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: WAITLIST_PRIORITY_SPLIT_MESSAGE,
    });
  }
}

const SERIALIZATION_FAILURE = "P2034";
const MAX_RETRIES = 3;

/**
 * SERIALIZABLE with retries on serialization failures: makes capacity-check-then-insert
 * safe against concurrent registrations for the last seat.
 */
export async function runSerializable<T>(
  db: Db,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const isSerializationFailure =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === SERIALIZATION_FAILURE;
      if (!isSerializationFailure || attempt >= MAX_RETRIES) {
        throw error;
      }
    }
  }
}
