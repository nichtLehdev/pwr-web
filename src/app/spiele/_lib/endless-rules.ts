/** Regeln der Endlos-Bestenliste, gleich für Browser und Server. */
export const ENDLESS_HEARTS = 3;
export const NOTE_TIME_MS = 6000;
/** Ventile und Zug brauchen mehr Handgriffe als ein Tonname. */
export const GRIFFE_NOTE_TIME_MS = 8000;
/** So viele Aufgaben liegen immer vor dem Browser bereit. */
export const ENDLESS_AHEAD = 20;
export const ENDLESS_REPORT_EVERY = 10;
/** Netz und Rechner brauchen etwas Luft; mehr wäre Zeit zum Nachschlagen. */
const TIME_SLACK_MS = 500;
/** Schneller kann kein Mensch antworten und das Ergebnis sehen. */
export const MIN_MS_PER_ANSWER = 600;
/** Rückmeldung und Netz zusätzlich zur Notenzeit; längere Pausen machen den Lauf ungültig. */
const PAUSE_PER_ANSWER_MS = 4500;
export const START_SLACK_MS = 60000;

export type EndlessAnswer = { label: string | null; ms: number };

export function answerInTime(
  answer: EndlessAnswer,
  noteTimeMs = NOTE_TIME_MS,
): boolean {
  return answer.label !== null && answer.ms <= noteTimeMs + TIME_SLACK_MS;
}

/** Passt die Zahl der Antworten zur Zeit, die seit dem Start vergangen ist? */
export function plausiblePace(
  answered: number,
  elapsedMs: number,
  noteTimeMs = NOTE_TIME_MS,
): boolean {
  return (
    elapsedMs >= answered * MIN_MS_PER_ANSWER &&
    elapsedMs <= answered * (noteTimeMs + PAUSE_PER_ANSWER_MS) + START_SLACK_MS
  );
}

/** Ein Lauf darf nicht mehr Musik enthalten, als seit dem Start Zeit vergangen ist. */
export const AHEAD_SLACK_MS = 5000;
