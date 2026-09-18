/**
 * Warum die eingetragenen Teilnehmer voraussichtlich keinen Platz bekommen. Nur ein
 * Hinweis vorab mit den Plätzen vom Seitenladen; entscheidend bleibt der Server.
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
 * Wie `findFullPriceTier` auf dem Server zählen nur Kategorien mit eigenem Limit. Die
 * übrigen Personen dieser Anmeldung in der Kategorie belegen die Restplätze schon.
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
