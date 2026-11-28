function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Tage in Folge mit mindestens einer Runde. Heute darf noch fehlen, gestern nicht. */
export function dailyStreak(playedAt: readonly string[], now: Date): number {
  const days = new Set(playedAt.map((iso) => localDayKey(new Date(iso))));
  const cursor = new Date(now);
  if (!days.has(localDayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
