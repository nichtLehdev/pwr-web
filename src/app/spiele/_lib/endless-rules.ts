/** Regeln der Endlos-Bestenliste, gleich für Browser und Server. */
export const ENDLESS_HEARTS = 3;
export const NOTE_TIME_MS = 6000;
/** So viele Aufgaben liegen immer vor dem Browser bereit. */
export const ENDLESS_AHEAD = 20;
export const ENDLESS_REPORT_EVERY = 10;
/** Netz und Rechner brauchen etwas Luft; mehr wäre Zeit zum Nachschlagen. */
const TIME_SLACK_MS = 500;
/** Schneller kann kein Mensch antworten und das Ergebnis sehen. */
export const MIN_MS_PER_ANSWER = 600;
/** Note, Rückmeldung und Netz: Längere Pausen machen den Lauf ungültig. */
export const MAX_MS_PER_ANSWER = 10500;
export const START_SLACK_MS = 60000;

export type EndlessAnswer = { label: string | null; ms: number };

export function answerInTime(answer: EndlessAnswer): boolean {
  return answer.label !== null && answer.ms <= NOTE_TIME_MS + TIME_SLACK_MS;
}

/** Passt die Zahl der Antworten zur Zeit, die seit dem Start vergangen ist? */
export function plausiblePace(answered: number, elapsedMs: number): boolean {
  return (
    elapsedMs >= answered * MIN_MS_PER_ANSWER &&
    elapsedMs <= answered * MAX_MS_PER_ANSWER + START_SLACK_MS
  );
}
