import { z } from "zod";

/**
 * Probenzeiten so, wie das Ensemble-Formular sie speichert: ein Wochentag aus
 * der festen Liste und der Probenbeginn aus `<input type="time">` (`HH:MM`).
 * Die Prozeduren nehmen beliebigen Text an; ohne diese Schranke schreiben
 * KI-Clients Spannen wie „19:30 - 21:30 Uhr“, die das Formular nicht anzeigt.
 */
export const REHEARSAL_DAYS = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
] as const;

const REHEARSAL_START = /^([01]\d|2[0-3]):[0-5]\d$/;

const rehearsalSchedule = z.object({
  day: z.enum(REHEARSAL_DAYS),
  time: z
    .string()
    .regex(
      REHEARSAL_START,
      "Nur der Probenbeginn als HH:MM, z. B. 19:30 – ohne Ende und ohne „Uhr“.",
    )
    .describe(
      "Probenbeginn als HH:MM (24 h), z. B. 19:30. Kein Probenende, kein „Uhr“.",
    ),
});

/**
 * Eingabe von `ensembles.create`/`ensembles.update` für MCP: strenge
 * Probenzeiten, ohne die Altfelder `rehearsalDay`/`rehearsalTime`.
 */
export function restrictEnsembleInput(input: z.ZodObject): z.ZodObject {
  return input.omit({ rehearsalDay: true, rehearsalTime: true }).extend({
    rehearsalSchedules: z
      .array(rehearsalSchedule)
      .optional()
      .describe(
        "Ein Eintrag pro Wochentag. Beim Ändern ersetzt die Liste alle bisherigen Probenzeiten.",
      ),
  });
}
