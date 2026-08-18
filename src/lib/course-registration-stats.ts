import type { PrismaClient } from "~/generated/prisma/client";
import { RegistrationStatus } from "~/generated/prisma/client";

export type CourseRegistrationStats = {
  totalConfirmedParticipants: number;
  /**
   * Belegte Plätze je Preiskategorie, **nach id**. Nicht nach Label: ein Kurs
   * darf zwei Kategorien mit demselben Namen führen (dieselbe Zimmerart in
   * zwei Häusern), und nach Label gezählt liefen beide in einen Topf.
   */
  byPriceOptionId: Record<string, number>;
};

export async function getCourseRegistrationStats(
  db: PrismaClient,
  courseId: string,
): Promise<CourseRegistrationStats> {
  const [participants, priceOptions] = await Promise.all([
    db.participant.findMany({
      where: {
        registration: {
          courseId,
          registrationStatus: RegistrationStatus.CONFIRMED,
        },
      },
      select: { priceOptionId: true, priceOption: true },
    }),
    db.coursePriceOption.findMany({
      where: { courseId },
      select: { id: true, label: true },
    }),
  ]);

  // Altbestand ohne id zählt nur mit, wenn sein Label im Kurs einmalig ist —
  // bei Duplikaten ist nicht mehr feststellbar, welche Kategorie gemeint war.
  const uniqueLabelToId = new Map<string, string>();
  for (const option of priceOptions) {
    if (priceOptions.filter((o) => o.label === option.label).length === 1) {
      uniqueLabelToId.set(option.label, option.id);
    }
  }

  const byPriceOptionId: Record<string, number> = {};
  for (const participant of participants) {
    const id =
      participant.priceOptionId ??
      (participant.priceOption
        ? uniqueLabelToId.get(participant.priceOption)
        : undefined);
    if (!id) continue;
    byPriceOptionId[id] = (byPriceOptionId[id] ?? 0) + 1;
  }

  return {
    totalConfirmedParticipants: participants.length,
    byPriceOptionId,
  };
}
