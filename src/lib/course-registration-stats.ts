import type { PrismaClient } from "~/generated/prisma/client";
import { RegistrationStatus } from "~/generated/prisma/client";

export type CourseRegistrationStats = {
  totalConfirmedParticipants: number;
  byPriceOptionLabel: Record<string, number>;
};

export async function getCourseRegistrationStats(
  db: PrismaClient,
  courseId: string,
): Promise<CourseRegistrationStats> {
  const participants = await db.participant.findMany({
    where: {
      registration: {
        courseId,
        registrationStatus: RegistrationStatus.CONFIRMED,
      },
    },
    select: { priceOption: true },
  });

  const byPriceOptionLabel: Record<string, number> = {};
  for (const participant of participants) {
    const label = participant.priceOption ?? "";
    byPriceOptionLabel[label] = (byPriceOptionLabel[label] ?? 0) + 1;
  }

  return {
    totalConfirmedParticipants: participants.length,
    byPriceOptionLabel,
  };
}
