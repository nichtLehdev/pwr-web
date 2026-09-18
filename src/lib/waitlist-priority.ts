import {
  defaultSeatSelection,
  type SeatAvailability,
} from "./registration-split";
import { withSeatsTaken } from "./waitlist-offer";

/**
 * Vorrang der Warteliste: Neue bekommen nur Plätze, die keine wartende Anmeldung nutzen
 * könnte. Alle Wartenden reservieren der Reihe nach, ohne an der ersten nicht passenden
 * anzuhalten — ein volles Einzelzimmer blockiert so keine Doppelzimmer.
 */

/** `waitlist`: Preiskategorie je Teilnehmer jeder wartenden Anmeldung, in Eingangsreihenfolge. */
export function seatsLeftForNewRegistrations<T extends SeatAvailability>(
  availability: T,
  waitlist: ReadonlyArray<ReadonlyArray<string | null | undefined>>,
): T {
  let left: SeatAvailability = availability;
  for (const participantPriceOptionIds of waitlist) {
    const usable = defaultSeatSelection(participantPriceOptionIds, left);
    if (usable.length === 0) continue;
    left = withSeatsTaken(
      left,
      usable.map((index) => participantPriceOptionIds[index]),
    );
  }
  return { ...availability, ...left };
}

type SeatSummary = {
  availableSlots: number;
  /** Restplätze je Preiskategorie, nach id. */
  capacityByPriceOption: Record<string, number> | null;
  isFull?: boolean;
};

/**
 * Ohne die Plätze der Wartenden, damit Kursseite und Formular „Nur Warteliste“ zeigen statt
 * einen Platz zu versprechen. Keine Kategorie meldet mehr Plätze, als der Kurs noch hat.
 */
export function seatSummaryForNewRegistrations<T extends SeatSummary>(
  summary: T,
  priceOptions: SeatAvailability["priceOptions"],
  waitlist: ReadonlyArray<ReadonlyArray<string | null | undefined>>,
): T {
  if (waitlist.length === 0) return summary;
  const left = seatsLeftForNewRegistrations(
    {
      availableSlots: summary.availableSlots,
      priceOptions,
      capacityByPriceOption: summary.capacityByPriceOption,
    },
    waitlist,
  );
  const availableSlots = left.availableSlots ?? summary.availableSlots;
  return {
    ...summary,
    availableSlots,
    ...(summary.isFull !== undefined && { isFull: availableSlots === 0 }),
    capacityByPriceOption: left.capacityByPriceOption
      ? Object.fromEntries(
          Object.entries(left.capacityByPriceOption).map(([id, free]) => [
            id,
            Math.min(free, availableSlots),
          ]),
        )
      : summary.capacityByPriceOption,
  };
}

/**
 * Meldung, wenn Anmeldende eine bestätigte Anmeldung vergrößern oder die
 * Kategorie wechseln wollen, der Platz dafür aber Wartenden zusteht.
 */
export const WAITLIST_PRIORITY_EDIT_MESSAGE =
  "Die freien Plätze, die diese Änderung bräuchte, stehen Anmeldungen zu, die schon auf der Warteliste warten. Weitere Teilnehmer oder diesen Wechsel der Preiskategorie können wir deshalb gerade nicht annehmen. Neue Teilnehmer können Sie auch gesondert anmelden.";

/**
 * Beim Aufteilen einer neuen Anmeldung. Ohne Anrede, weil Anmeldende und Kursteam
 * sie gleichermaßen sehen.
 */
export const WAITLIST_PRIORITY_SPLIT_MESSAGE =
  "Einige der freien Plätze stehen Anmeldungen zu, die schon auf der Warteliste warten, und die übrigen reichen für die gewählten Teilnehmer nicht. Bitte die Auswahl anpassen oder die ganze Anmeldung auf die Warteliste setzen.";
