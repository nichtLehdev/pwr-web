import { Prisma, RegistrationStatus } from "~/generated/prisma/client";
import { TRPCError } from "@trpc/server";
import type { db as database } from "@/server/db";
import { SEAT_SELECTION_OUTDATED_MESSAGE } from "@/lib/registration-split";

type Db = typeof database;
type Tx = Prisma.TransactionClient;

export type CapacityCourse = {
  maxParticipants: number | null;
  priceOptions: Array<{ label: string; maxParticipants: number | null }>;
};

/**
 * Canonical total seat capacity of a course. Returns Infinity for genuinely
 * unlimited courses.
 *
 * - Course-level maxParticipants always caps, when set (a stored 0 means 0,
 *   not unlimited).
 * - If every price tier has its own limit, the sum of tier limits also caps.
 * - A course with no course-level limit and at least one unlimited tier (or
 *   no tiers at all) is unlimited.
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

/**
 * Number of participants currently occupying seats. Only CONFIRMED
 * registrations consume capacity — waitlisted, cancelled, and
 * pending-discount registrations do not.
 */
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

export function priceTierFullMessage(option: { label: string }): string {
  return `Die Preisoption "${option.label}" ist ausgebucht.`;
}

/**
 * Die erste Preiskategorie, in die die neuen Teilnehmer nicht mehr passen —
 * `null`, wenn alle passen. Gezählt werden nur bestätigte Anmeldungen.
 *
 * Zählt über `priceOptionId`, nicht über das Label: ein Kurs darf zwei
 * Kategorien mit demselben Namen führen, und über das Label wurde die eine
 * gegen das Limit der anderen geprüft — mal zu streng, mal zu lasch.
 *
 * Teilnehmer aus der Zeit vor der id-Migration werden mitgezählt, sofern ihr
 * Label im Kurs eindeutig ist; bei Duplikaten sind sie nicht zuzuordnen und
 * bleiben außen vor (die Kurs-Gesamtkapazität greift weiterhin).
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
 * Freie Plätze eines Kurses nach denselben Regeln wie die Prüfungen beim
 * Bestätigen: Kurskapazität minus Bestätigte, dazu die Restplätze jeder
 * begrenzten Kategorie — nach id, nicht nach Label. Grundlage fürs Nachrücken.
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
 * Prüft beim Aufteilen, ob die für die freien Plätze gewählten Teilnehmer
 * noch in Kurs und Preiskategorien passen. Die Plätze stammen vom Laden der
 * Seite und können inzwischen vergeben sein.
 */
export async function assertSeatSelectionFits(
  db: Db | Tx,
  {
    course,
    participants,
    selection,
    confirmedCount,
  }: {
    course: {
      id: string;
      maxParticipants: number | null;
      priceOptions: TierPriceOption[];
    };
    participants: ReadonlyArray<{ priceOptionId: string }>;
    selection: readonly number[];
    /** Bereits bestätigte Teilnehmer des Kurses. */
    confirmedCount: number;
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
}

const SERIALIZATION_FAILURE = "P2034";
const MAX_RETRIES = 3;

/**
 * Run `fn` in a SERIALIZABLE transaction, retrying on serialization
 * failures. This is what makes capacity-check-then-insert safe against
 * concurrent registrations for the last seat.
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
