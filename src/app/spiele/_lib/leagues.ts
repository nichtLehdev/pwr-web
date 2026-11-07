import { berlinDate, berlinParts } from "@/lib/berlin-time";

/** Ligen nach Lautstärke: von leise bis ganz laut. */
export const TIERS = [
  "Piano",
  "Mezzopiano",
  "Mezzoforte",
  "Forte",
  "Fortissimo",
] as const;

export const GROUP_SIZE = 30;
/** Kleinere Gruppen steigen weder auf noch ab: Bei vier Kindern wäre das nur Zufall. */
export const MIN_GROUP_FOR_MOVEMENT = 10;
export const MOVE_COUNT = 3;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function tierName(tier: number): string {
  return TIERS[Math.min(TIERS.length - 1, Math.max(0, tier))]!;
}

/** Montag 0 Uhr deutscher Zeit der Woche, in die `now` fällt. */
export function weekStartOf(now: Date): Date {
  const { year, month, day, weekday } = berlinParts(now);
  const back = (weekday + 6) % 7;
  const monday = new Date(Date.UTC(year, month - 1, day - back));
  return berlinDate(
    monday.getUTCFullYear(),
    monday.getUTCMonth() + 1,
    monday.getUTCDate(),
  );
}

export function weekEndOf(weekStart: Date): Date {
  const next = new Date(weekStart.getTime() + WEEK_MS + 12 * 60 * 60 * 1000);
  return weekStartOf(next);
}

/** 1 auf, -1 ab, 0 bleibt; `rank` beginnt bei 0. */
export function movementFor(
  rank: number,
  size: number,
  tier: number,
): -1 | 0 | 1 {
  if (size < MIN_GROUP_FOR_MOVEMENT) return 0;
  if (rank < MOVE_COUNT && tier < TIERS.length - 1) return 1;
  if (rank >= size - MOVE_COUNT && tier > 0) return -1;
  return 0;
}

export type GroupSlot = { groupId: string; tier: number; members: number };

/**
 * Freie Gruppe derselben Stufe; solange es in der Woche nur eine Gruppe gibt und sie
 * Platz hat, kommen alle hinein, damit am Anfang niemand allein spielt.
 */
export function pickGroup(groups: GroupSlot[], tier: number): string | null {
  const open = groups.filter((g) => g.members < GROUP_SIZE);
  const sameTier = open.find((g) => g.tier === tier);
  if (sameTier) return sameTier.groupId;
  if (groups.length === 1 && open.length === 1) return open[0]!.groupId;
  return null;
}
