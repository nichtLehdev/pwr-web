/**
 * Zwei Signale, die jedes echte Formular mitschickt: ein unsichtbares Feld, das
 * leer bleiben muss, und die Zeit zwischen Aufbau und Absenden. Client und
 * Server teilen sich diese Datei, damit Feldname und Grenzwert nicht
 * auseinanderlaufen.
 */

/** Unsichtbar für Menschen; einfache Bots füllen aus, was ein Feld hat. */
export const BOT_TRAP_FIELD = "website";

/** Millisekunden zwischen Aufbau des Formulars und Absenden. */
export const BOT_TRAP_ELAPSED_FIELD = "elapsedMs";

/**
 * Die Registrierung läuft über den Endpunkt von better-auth, dessen Body einem
 * festen Schema folgt — für die Registrierung bleiben nur eigene Header.
 */
export const BOT_TRAP_HEADER = "x-form-website";
export const BOT_TRAP_ELAPSED_HEADER = "x-form-elapsed";

/**
 * Wer eine Adresse tippt und eine Einwilligung anklickt, braucht länger als
 * zwei Sekunden. Bots senden in Millisekunden.
 */
export const MIN_FILL_TIME_MS = 2000;

/** `missing` heißt: kein Signal dabei — der Aufruf kam nicht aus dem Formular. */
export type BotTrapVerdict = "ok" | "honeypot" | "too-fast" | "missing";

export function inspectBotTrap(values: {
  trap: string | null | undefined;
  elapsedMs: number | null | undefined;
}): BotTrapVerdict {
  if (typeof values.trap === "string" && values.trap.trim() !== "") {
    return "honeypot";
  }

  const elapsed = values.elapsedMs;
  if (typeof elapsed !== "number" || !Number.isFinite(elapsed) || elapsed < 0) {
    return "missing";
  }

  return elapsed < MIN_FILL_TIME_MS ? "too-fast" : "ok";
}

export function botTrapFromHeaders(headers: Headers): BotTrapVerdict {
  const elapsed = headers.get(BOT_TRAP_ELAPSED_HEADER)?.trim();

  return inspectBotTrap({
    trap: headers.get(BOT_TRAP_HEADER),
    // Ohne Header darf kein `Number("")` daraus werden: das wäre 0 und damit
    // ein zu schnelles statt eines fehlenden Formulars.
    elapsedMs: elapsed ? Number(elapsed) : null,
  });
}
