import {
  defaultSeatSelection,
  type SeatAvailability,
} from "./registration-split";
import { withSeatsTaken } from "./waitlist-offer";

/**
 * Vorrang der Warteliste.
 *
 * Seit dem 18.09.2026 rückt niemand mehr automatisch nach: Frei gewordene
 * Plätze bleiben frei, bis das Kursteam die Warteliste nachrücken lässt.
 * Ohne diese Regel bekäme sie in der Zwischenzeit die nächste neue Anmeldung —
 * wer seit Wochen wartet, würde von jemandem überholt, der zufällig nach der
 * Stornierung kam.
 *
 * Neue Anmeldungen bekommen deshalb nur Plätze, die keine wartende Anmeldung
 * nutzen könnte. Die Wartenden reservieren der Reihe nach, was sie mit den
 * freien Plätzen nutzen könnten — alle, ohne an der ersten nicht passenden
 * anzuhalten (anders als beim Nachrücken). Wer auf ein ausgebuchtes
 * Einzelzimmer wartet, reserviert also nichts, und Doppelzimmer lassen sich
 * weiter normal buchen; eine strengere Fassung („wartet jemand, ist alles
 * belegt“) hätte genau das blockiert.
 *
 * Gilt für öffentliche Anmeldungen, für vom Team „automatisch“ erfasste und
 * für alles, was Anmeldende selbst an einer bestätigten Anmeldung hinzufügen.
 * Das Team darf die reservierten Plätze bewusst vergeben (ausdrücklich
 * bestätigen, Anmeldungen umbauen).
 */

/**
 * Die freien Plätze, die nach den Reservierungen der Wartenden für neue
 * Anmeldungen übrig bleiben.
 *
 * @param availability tatsächlich freie Plätze (Kurs und begrenzte Kategorien)
 * @param waitlist Preiskategorie je Teilnehmer jeder wartenden Anmeldung, in
 *   Eingangsreihenfolge
 */
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
 * Die Platzübersicht, wie Neue sie sehen (`courses.getAvailableSlots`, die
 * Kursliste): ohne die Plätze, die Wartende nutzen könnten. So zeigen
 * Kursseite und Anmeldeformular „Nur Warteliste“, statt einen Platz zu
 * versprechen, den der Server dann den Wartenden vorbehält.
 *
 * Keine Kategorie meldet danach mehr Plätze, als der Kurs noch hat — auch die
 * unbegrenzten nicht, die in der Übersicht den Rest des Kurses teilen.
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
 * Meldung, wenn beim Aufteilen einer neuen Anmeldung die gewählten Teilnehmer
 * Plätze bräuchten, die Wartenden zustehen. Ohne Anrede, weil Anmeldende und
 * Kursteam sie gleichermaßen sehen.
 */
export const WAITLIST_PRIORITY_SPLIT_MESSAGE =
  "Einige der freien Plätze stehen Anmeldungen zu, die schon auf der Warteliste warten, und die übrigen reichen für die gewählten Teilnehmer nicht. Bitte die Auswahl anpassen oder die ganze Anmeldung auf die Warteliste setzen.";
