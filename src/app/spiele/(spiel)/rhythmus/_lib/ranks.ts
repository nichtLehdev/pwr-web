import { LEVELS } from "../../../_lib/rhythm/levels";
import type { Progress } from "./prefs";

const RANKS = [
  { from: 0, title: "Neu im Chor" },
  { from: 5, title: "Jungbläser:in" },
  { from: 12, title: "Taktgeber:in" },
  { from: 22, title: "Rhythmus-Profi" },
  { from: 34, title: "Stütze im Chor" },
  { from: 45, title: "Chorleitung" },
] as const;

export const MAX_STARS = LEVELS.length * 3;

export function totalStars(progress: Progress): number {
  return LEVELS.reduce((sum, l) => sum + (progress[l.id]?.stars ?? 0), 0);
}

export function rankFor(stars: number): {
  title: string;
  nextTitle: string | null;
  starsToNext: number;
} {
  let index = 0;
  RANKS.forEach((rank, i) => {
    if (stars >= rank.from) index = i;
  });
  const next = RANKS[index + 1];
  return {
    title: RANKS[index]!.title,
    nextTitle: next?.title ?? null,
    starsToNext: next ? next.from - stars : 0,
  };
}
