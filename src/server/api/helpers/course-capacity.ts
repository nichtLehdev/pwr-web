import { Prisma, RegistrationStatus } from "~/generated/prisma/client";
import { TRPCError } from "@trpc/server";
import type { db as database } from "@/server/db";

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

/**
 * Throws BAD_REQUEST when adding `additionsByLabel` participants would
 * overbook any limited price tier (counting CONFIRMED registrations only).
 */
export async function assertPriceTierCapacity(
  db: Db | Tx,
  courseId: string,
  priceOptions: Array<{ label: string; maxParticipants: number | null }>,
  additionsByLabel: Record<string, number>,
  excludeRegistrationId?: string,
): Promise<void> {
  for (const [label, addition] of Object.entries(additionsByLabel)) {
    const priceOption = priceOptions.find((p) => p.label === label);
    if (priceOption?.maxParticipants == null) continue;

    const currentCount = await db.participant.count({
      where: {
        priceOption: label,
        registration: {
          courseId,
          registrationStatus: RegistrationStatus.CONFIRMED,
          ...(excludeRegistrationId
            ? { id: { not: excludeRegistrationId } }
            : {}),
        },
      },
    });

    if (currentCount + addition > priceOption.maxParticipants) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Die Preisoption "${label}" ist ausgebucht.`,
      });
    }
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
