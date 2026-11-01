/**
 * Nachmeldelinks: einmal nutzbare Links, mit denen sich jemand über das öffentliche
 * Formular anmelden kann, obwohl die Anmeldefrist abgelaufen (oder die Anmeldung
 * geschlossen bzw. noch nicht geöffnet) ist. Kapazität, Preise und Pflichtfelder
 * gelten wie bei jeder Anmeldung.
 */

/** Query-Parameter des Links auf der Anmeldeseite. */
export const LATE_REGISTRATION_PARAM = "nachmeldung";

/** Wählbare Gültigkeiten in Tagen; die erste ist die Vorgabe. */
export const LATE_REGISTRATION_VALID_DAYS = [7, 3, 1, 14, 30] as const;
export const MAX_LATE_REGISTRATION_VALID_DAYS = 30;

export type LateRegistrationLinkState = "open" | "used" | "revoked" | "expired";

export function lateRegistrationLinkState(
  link: {
    usedAt: Date | string | null;
    revokedAt: Date | string | null;
    expiresAt: Date | string;
  },
  now: Date = new Date(),
): LateRegistrationLinkState {
  if (link.usedAt) return "used";
  if (link.revokedAt) return "revoked";
  if (new Date(link.expiresAt) <= now) return "expired";
  return "open";
}

/**
 * Ablauf nach `validDays`, aber nie nach Kursende: danach ist eine Anmeldung
 * ohnehin sinnlos.
 */
export function lateRegistrationLinkExpiry(
  validDays: number,
  courseEndDate: Date | string,
  now: Date = new Date(),
): Date {
  const requested = new Date(now.getTime() + validDays * 24 * 60 * 60 * 1000);
  const courseEnd = new Date(courseEndDate);
  return requested < courseEnd ? requested : courseEnd;
}

export const LATE_REGISTRATION_LINK_STATE_LABELS: Record<
  LateRegistrationLinkState,
  string
> = {
  open: "Offen",
  used: "Benutzt",
  revoked: "Zurückgezogen",
  expired: "Abgelaufen",
};

/** Meldung für Anmeldende, deren Link nicht (mehr) gilt. */
export function lateRegistrationLinkUnusableMessage(
  state: Exclude<LateRegistrationLinkState, "open"> | "unknown",
): string {
  switch (state) {
    case "used":
      return "Dieser Nachmeldelink wurde bereits für eine Anmeldung verwendet. Jeder Link gilt nur für eine Anmeldung.";
    case "revoked":
      return "Dieser Nachmeldelink wurde vom Kursteam zurückgezogen.";
    case "expired":
      return "Dieser Nachmeldelink ist abgelaufen.";
    case "unknown":
      return "Dieser Nachmeldelink ist ungültig. Bitte prüfe, ob du ihn vollständig kopiert hast.";
  }
}
