export type Stars = 0 | 1 | 2 | 3;

export function starsFor(percent: number): Stars {
  if (percent >= 90) return 3;
  if (percent >= 75) return 2;
  if (percent >= 60) return 1;
  return 0;
}

export function resultHeadline(stars: Stars): string {
  if (stars === 3) return "Das sitzt.";
  if (stars === 2) return "Gut gespielt.";
  if (stars === 1) return "Geschafft.";
  return "Noch eine Runde.";
}

const PRAISE = ["Richtig", "Genau", "Stark", "Sauber", "Klasse"] as const;

/** Lob wechselt mit der Serie; runde Serien werden als solche genannt. */
export function praiseFor(streak: number): string {
  if (streak > 0 && streak % 5 === 0) return `${streak} in Folge`;
  return PRAISE[Math.max(0, streak - 1) % PRAISE.length]!;
}
