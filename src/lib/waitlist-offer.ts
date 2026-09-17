import { registrationSeatShortage } from "./registration-seat-shortage";
import {
  defaultSeatSelection,
  type SeatAvailability,
} from "./registration-split";

/**
 * Nachrücken von der Warteliste.
 *
 * Werden Plätze frei, geht die Warteliste der Reihe nach durch. Passt eine
 * Anmeldung ganz, wird sie bestätigt. Passt nur ein Teil, bekommt sie ein
 * Angebot: die Anmeldenden wählen, wer nachrückt, oder lehnen ab. Bis dahin
 * hält die Warteliste an — höchstens sieben Tage. Abgelehnte oder verfallene
 * Plätze gehen an die Nächsten; die Anmeldung behält ihren Platz.
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
