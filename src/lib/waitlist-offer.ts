import { registrationSeatShortage } from "./registration-seat-shortage";
import {
  defaultSeatSelection,
  type SeatAvailability,
} from "./registration-split";

/**
 * Nachgerückt wird nur auf Knopfdruck des Kursteams, weil Plätze oft nur kurz frei werden;
 * bis dahin gehören sie der Warteliste. Passt eine Anmeldung nur teilweise, bekommt sie ein
 * Angebot und die Warteliste hält an; abgelehnte Plätze gelten als weitergegeben.
 */

export const PROMOTION_OFFER_DAYS = 7;

/** So lange vor Ablauf erfährt das Kursteam, dass ein Angebot ausläuft. */
export const PROMOTION_OFFER_REMINDER_HOURS = 48;

const HOUR = 60 * 60 * 1000;

/** Ende eines neuen Angebots: sieben Tage, aber nie über den Kursbeginn hinaus. */
export function promotionOfferDeadline(now: Date, courseStart: Date): Date {
  const deadline = new Date(now.getTime() + PROMOTION_OFFER_DAYS * 24 * HOUR);
  return deadline < courseStart ? deadline : new Date(courseStart);
}

/** Ob das Kursteam jetzt an das auslaufende Angebot erinnert werden soll. */
export function promotionOfferReminderDue(
  offer: { expiresAt: Date; reminderSentAt: Date | null },
  now: Date,
): boolean {
  const remaining = offer.expiresAt.getTime() - now.getTime();
  return (
    !offer.reminderSentAt &&
    remaining > 0 &&
    remaining <= PROMOTION_OFFER_REMINDER_HOURS * HOUR
  );
}

export type PromotionDecision =
  /** Alle passen: bestätigen und mit der Nächsten weitermachen. */
  | { kind: "confirm" }
  /** Ein Teil passt: Angebot über so viele Plätze, die Warteliste hält an. */
  | { kind: "offer"; seats: number }
  /** Ein Angebot läuft noch: die Warteliste hält an. */
  | { kind: "hold" }
  /** Bei so vielen Plätzen schon abgelehnt oder verfallen: weiter zur Nächsten. */
  | { kind: "skip" }
  /** Niemand passt, etwa weil die Kategorie voll ist: die Warteliste hält an. */
  | { kind: "stop" };

/** Was mit einer wartenden Anmeldung geschieht, wenn Plätze frei sind. */
export function decidePromotion(
  participantPriceOptionIds: ReadonlyArray<string | null | undefined>,
  availability: SeatAvailability,
  {
    offerActive,
    passedSeats,
  }: { offerActive: boolean; passedSeats: number | null },
): PromotionDecision {
  if (participantPriceOptionIds.length === 0) return { kind: "skip" };

  const fitsCompletely =
    registrationSeatShortage({ participantPriceOptionIds, ...availability }) ===
    null;
  if (fitsCompletely) return { kind: "confirm" };

  const seats = defaultSeatSelection(
    participantPriceOptionIds,
    availability,
  ).length;
  if (seats === 0) return { kind: "stop" };
  if (offerActive) return { kind: "hold" };
  if (passedSeats != null && seats <= passedSeats) return { kind: "skip" };
  return { kind: "offer", seats };
}

/** Wie viele der Teilnehmer die freien Plätze gerade nutzen könnten. */
export function usableSeats(
  participantPriceOptionIds: ReadonlyArray<string | null | undefined>,
  availability: SeatAvailability,
): number {
  return defaultSeatSelection(participantPriceOptionIds, availability).length;
}

/** Freie Plätze, nachdem diese Teilnehmer bestätigt wurden. */
export function withSeatsTaken(
  availability: SeatAvailability,
  participantPriceOptionIds: ReadonlyArray<string | null | undefined>,
): SeatAvailability {
  const capacityByPriceOption = availability.capacityByPriceOption
    ? { ...availability.capacityByPriceOption }
    : availability.capacityByPriceOption;
  for (const id of participantPriceOptionIds) {
    const free = id ? capacityByPriceOption?.[id] : undefined;
    if (id && capacityByPriceOption && free != null) {
      capacityByPriceOption[id] = Math.max(0, free - 1);
    }
  }
  return {
    ...availability,
    availableSlots:
      availability.availableSlots == null
        ? availability.availableSlots
        : Math.max(
            0,
            availability.availableSlots - participantPriceOptionIds.length,
          ),
    capacityByPriceOption,
  };
}

/** Eine wartende Anmeldung, so weit das Nachrücken sie kennen muss. */
export type WaitingRegistration = {
  id: string;
  /** Preiskategorie je Teilnehmer, in Reihenfolge der Anmeldung. */
  participantPriceOptionIds: ReadonlyArray<string | null | undefined>;
  offerExpiresAt: Date | null;
  passedSeats: number | null;
};

/**
 * Als weitergegeben gelten so viele Plätze, wie die Anmeldung jetzt nutzen könnte;
 * erst mehr freie Plätze bringen ihr ein neues Angebot.
 */
export function expiredOfferClosures(
  waitlist: readonly WaitingRegistration[],
  availability: SeatAvailability,
  now: Date,
): Array<{ id: string; passedSeats: number }> {
  return waitlist
    .filter(
      (registration) =>
        registration.offerExpiresAt !== null &&
        registration.offerExpiresAt <= now,
    )
    .map((registration) => ({
      id: registration.id,
      passedSeats: usableSeats(
        registration.participantPriceOptionIds,
        availability,
      ),
    }));
}

/** Warum ein Nachrücken dort aufgehört hat, wo es aufgehört hat. */
export type PromotionHalt =
  /** Der Kurs führt keine Warteliste. */
  | { kind: "waiting_list_disabled" }
  /** Der Kurs hat begonnen — niemand wird mehr hineinbestätigt. */
  | { kind: "course_started" }
  | { kind: "nobody_waiting" }
  /** Kein Platz frei (mehr): alle vergeben oder nie welche frei gewesen. */
  | { kind: "no_free_seats" }
  /** Die Anmeldung vorn hat ein laufendes Angebot. */
  | { kind: "offer_running"; registrationId: string }
  /**
   * Die Anmeldung vorn passt nicht. Die Schlange bleibt stehen, damit eine große
   * Familie nicht dauerhaft von kleineren Gruppen überholt wird.
   */
  | { kind: "does_not_fit"; registrationId: string }
  /** Die Anmeldung vorn hat eben ein Angebot bekommen. */
  | { kind: "offered"; registrationId: string }
  /** Alle durchgegangen; `passed` davon hatten diese Plätze schon ausgeschlagen. */
  | { kind: "end_of_list"; passed: number };

export type PromotionPlan = {
  /** Diese Anmeldungen werden bestätigt, in dieser Reihenfolge. */
  confirm: string[];
  /** Diese bekommt ein Angebot über so viele Plätze. */
  offer: { id: string; seats: number } | null;
  halt: PromotionHalt;
};

/**
 * Erwartet die Warteliste in Anmeldereihenfolge und abgelaufene Angebote
 * bereits geschlossen.
 */
export function planPromotion(
  waitlist: readonly WaitingRegistration[],
  availability: SeatAvailability,
  now: Date,
): PromotionPlan {
  const confirm: string[] = [];
  let seats = availability;
  let passed = 0;
  if (waitlist.length === 0) {
    return { confirm, offer: null, halt: { kind: "nobody_waiting" } };
  }

  for (const registration of waitlist) {
    const decision = decidePromotion(
      registration.participantPriceOptionIds,
      seats,
      {
        offerActive:
          registration.offerExpiresAt !== null &&
          registration.offerExpiresAt > now,
        passedSeats: registration.passedSeats,
      },
    );

    switch (decision.kind) {
      case "confirm":
        confirm.push(registration.id);
        seats = withSeatsTaken(seats, registration.participantPriceOptionIds);
        continue;
      case "skip":
        passed += 1;
        continue;
      case "offer":
        return {
          confirm,
          offer: { id: registration.id, seats: decision.seats },
          halt: { kind: "offered", registrationId: registration.id },
        };
      case "hold":
        return {
          confirm,
          offer: null,
          halt: { kind: "offer_running", registrationId: registration.id },
        };
      case "stop":
        return {
          confirm,
          offer: null,
          halt:
            seats.availableSlots != null && seats.availableSlots <= 0
              ? { kind: "no_free_seats" }
              : { kind: "does_not_fit", registrationId: registration.id },
        };
    }
  }

  return { confirm, offer: null, halt: { kind: "end_of_list", passed } };
}

/** Ein Halt, wie das Kursteam ihn liest: mit Namen statt ids. */
export type PromotionHaltSummary =
  | Exclude<
      PromotionHalt,
      { kind: "offer_running" | "does_not_fit" | "offered" }
    >
  | { kind: "offer_running"; registrantName: string; expiresAt: Date }
  | { kind: "does_not_fit"; registrantName: string }
  | { kind: "offered"; registrantName: string };

/**
 * Warum (danach) niemand nachgerückt ist, als Satz fürs Kursteam. Mit `anyoneMoved`
 * erklärt er nur noch, warum der Durchgang dort endet.
 */
export function promotionHaltText(
  halt: PromotionHaltSummary,
  anyoneMoved: boolean,
  formatDate: (date: Date) => string,
): string | null {
  switch (halt.kind) {
    case "waiting_list_disabled":
      return "Der Kurs führt keine Warteliste.";
    case "course_started":
      return "Der Kurs hat schon begonnen – von der Warteliste wird nicht mehr nachgerückt.";
    case "nobody_waiting":
      return anyoneMoved ? null : "Auf der Warteliste steht niemand.";
    case "no_free_seats":
      return anyoneMoved
        ? "Danach ist kein Platz mehr frei."
        : "Es ist kein Platz frei.";
    case "offer_running":
      return `Das Angebot an ${halt.registrantName} läuft noch bis ${formatDate(halt.expiresAt)}. Bis dahin hält die Warteliste an.`;
    case "does_not_fit":
      return `${anyoneMoved ? "Danach steht" : "Vorn steht"} die Anmeldung von ${halt.registrantName}, und von ihr passt niemand in die freien Plätze – etwa weil ihre Preiskategorie voll ist. Die Warteliste hält dort an. Bestätige gezielt, wenn jemand anderes den Platz bekommen soll.`;
    case "offered":
      return null;
    case "end_of_list":
      if (anyoneMoved || halt.passed === 0) return null;
      return halt.passed === 1
        ? "Die wartende Anmeldung hat ein Angebot über so viele Plätze schon abgelehnt oder verstreichen lassen. Ein neues bekommt sie erst, wenn mehr Plätze frei sind."
        : `Alle ${halt.passed} wartenden Anmeldungen haben ein Angebot über so viele Plätze schon abgelehnt oder verstreichen lassen. Ein neues bekommen sie erst, wenn mehr Plätze frei sind.`;
  }
}
