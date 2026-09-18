/**
 * Warum die eingetragenen Teilnehmer voraussichtlich keinen Platz bekommen.
 *
 * Der Wartelisten-Hinweis im Formular erschien nur bei einem ganz vollen Kurs:
 * wer vier Teilnehmer für zwei freie Plätze eintrug, erfuhr erst aus der Mail,
 * dass die ganze Anmeldung auf der Warteliste steht. Die freien Plätze stammen
 * vom Laden der Seite — entscheidend bleibt der Server, dies ist nur der
 * Hinweis vorab.
 */
export type SeatShortage =
  | { kind: "course"; free: number; requested: number }
  | {
      kind: "priceOption";
      priceOptionId: string;
      free: number;
      /** Teilnehmer in dieser Kategorie, nicht in der ganzen Anmeldung. */
      requested: number;
    };

export function registrationSeatShortage({
  participantPriceOptionIds,
  availableSlots,
  priceOptions,
  capacityByPriceOption,
}: {
  /** Preiskategorie je eingetragenem Teilnehmer. */
  participantPriceOptionIds: ReadonlyArray<string | null | undefined>;
  /** Freie Plätze im Kurs; `Infinity` oder fehlend heißt unbegrenzt. */
  availableSlots: number | null | undefined;
  priceOptions: ReadonlyArray<{ id: string; maxParticipants: number | null }>;
  /** Restplätze je Kategorie, wie `courses.getAvailableSlots` sie liefert. */
  capacityByPriceOption: Readonly<Record<string, number>> | null | undefined;
}): SeatShortage | null {
  const requested = participantPriceOptionIds.length;
  if (requested === 0) return null;

  if (
    availableSlots != null &&
    Number.isFinite(availableSlots) &&
    requested > availableSlots
  ) {
    return { kind: "course", free: availableSlots, requested };
  }

  // Nur Kategorien mit eigenem Limit, wie auf dem Server: unbegrenzte teilen
  // sich die Plätze des Kurses, und die sind oben schon geprüft.
  for (const option of priceOptions) {
    if (option.maxParticipants == null) continue;
    const free = capacityByPriceOption?.[option.id];
    if (free == null) continue;
    const inOption = participantPriceOptionIds.filter(
      (id) => id === option.id,
    ).length;
    if (inOption > free) {
      return {
        kind: "priceOption",
        priceOptionId: option.id,
        free,
        requested: inOption,
      };
    }
  }

  return null;
}

/**
 * Ob eine Preiskategorie für eine weitere Person dieser Anmeldung ausgebucht
 * ist. Wie auf dem Server (`findFullPriceTier`) zählen nur Kategorien mit
 * eigenem Limit; unbegrenzte teilen sich die Plätze des Kurses, und dessen
 * Warteliste greift ohnehin. Die übrigen Personen derselben Anmeldung in
 * dieser Kategorie belegen die Restplätze schon — mit einem freien Platz ist
 * sie für die zweite Person voll.
 */
export function isPriceOptionFullFor({
  priceOptionId,
  otherParticipantPriceOptionIds,
  priceOptions,
  capacityByPriceOption,
}: {
  priceOptionId: string;
  /** Preiskategorien der anderen Personen dieser Anmeldung. */
  otherParticipantPriceOptionIds: ReadonlyArray<string | null | undefined>;
  priceOptions: ReadonlyArray<{ id: string; maxParticipants: number | null }>;
  capacityByPriceOption: Readonly<Record<string, number>> | null | undefined;
}): boolean {
  const option = priceOptions.find((po) => po.id === priceOptionId);
  if (option?.maxParticipants == null) return false;
  const free = capacityByPriceOption?.[option.id];
  if (free == null) return false;
  const taken = otherParticipantPriceOptionIds.filter(
    (id) => id === option.id,
  ).length;
  return taken >= free;
}
