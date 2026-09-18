import {
  computeSiblingDiscounts,
  roundMoney,
  type SiblingDiscountParticipant,
} from "./sibling-discount";
import {
  registrationSeatShortage,
  type SeatShortage,
} from "./registration-seat-shortage";

/**
 * Reichen die Plätze nicht, wählen die Anmeldenden, wer bestätigt wird; der Rest kommt
 * auf die Warteliste. Zwei Anmeldungen mit gemeinsamer `registrationGroupId` statt Status
 * je Teilnehmer, weil Kapazität, Rechnungen und Anzahlung an der Anmeldung hängen.
 */

/** Meldung, wenn die gewählten Teilnehmer beim Absenden nicht mehr passen. */
export const SEAT_SELECTION_OUTDATED_MESSAGE =
  "Für Ihre Auswahl sind inzwischen nicht mehr genug Plätze frei. Bitte passen Sie die Auswahl an.";

/** Freie Plätze, wie `courses.getAvailableSlots` sie meldet. */
export type SeatAvailability = {
  /** Freie Plätze im Kurs; `Infinity` oder fehlend heißt unbegrenzt. */
  availableSlots: number | null | undefined;
  priceOptions: ReadonlyArray<{ id: string; maxParticipants: number | null }>;
  capacityByPriceOption: Readonly<Record<string, number>> | null | undefined;
};

/**
 * Vorbelegung in Listenreihenfolge. Wer in einer vollen Kategorie steht, wird
 * übersprungen — nachfolgende in anderen Kategorien können noch passen.
 */
export function defaultSeatSelection(
  participantPriceOptionIds: ReadonlyArray<string | null | undefined>,
  availability: SeatAvailability,
): number[] {
  const selected: number[] = [];
  for (let index = 0; index < participantPriceOptionIds.length; index++) {
    const candidate = [...selected, index];
    const shortage = registrationSeatShortage({
      participantPriceOptionIds: candidate.map(
        (i) => participantPriceOptionIds[i],
      ),
      ...availability,
    });
    if (shortage === null) selected.push(index);
  }
  return selected;
}

export type SeatSelectionProblem =
  | { kind: "empty" }
  /** Alle gewählt — dann ist es keine Aufteilung, und alle passen nicht. */
  | { kind: "all" }
  | SeatShortage;

/** Warum eine Auswahl nicht in die freien Plätze passt — `null`, wenn sie passt. */
export function seatSelectionProblem(
  participantPriceOptionIds: ReadonlyArray<string | null | undefined>,
  selectedIndexes: readonly number[],
  availability: SeatAvailability,
): SeatSelectionProblem | null {
  if (selectedIndexes.length === 0) return { kind: "empty" };
  if (selectedIndexes.length >= participantPriceOptionIds.length) {
    return { kind: "all" };
  }
  return registrationSeatShortage({
    participantPriceOptionIds: selectedIndexes.map(
      (i) => participantPriceOptionIds[i],
    ),
    ...availability,
  });
}

/**
 * Ganze Zahlen im Bereich, keine doppelt, und ein echter Teil (mindestens einer
 * bestätigt, einer wartet). Sortiert, sonst `null`.
 */
export function normalizeSeatSelection(
  indexes: readonly number[],
  participantCount: number,
): number[] | null {
  const unique = [...new Set(indexes)].sort((a, b) => a - b);
  if (unique.length !== indexes.length) return null;
  if (unique.length === 0 || unique.length >= participantCount) return null;
  if (
    unique.some((i) => !Number.isInteger(i) || i < 0 || i >= participantCount)
  ) {
    return null;
  }
  return unique;
}

/** Ob die Auswahl Geschwister auf verschiedene Teile verteilt. */
export function splitsSiblingGroup(
  participants: ReadonlyArray<{ siblingGroupId?: string | null }>,
  selectedIndexes: readonly number[],
): boolean {
  const selected = new Set(selectedIndexes);
  const sides = new Map<string, Set<boolean>>();
  participants.forEach((participant, index) => {
    if (!participant.siblingGroupId) return;
    const side = sides.get(participant.siblingGroupId) ?? new Set<boolean>();
    side.add(selected.has(index));
    sides.set(participant.siblingGroupId, side);
  });
  return [...sides.values()].some((side) => side.size > 1);
}

/**
 * Über alle Teile der Gruppe gerechnet, damit getrennte Geschwister den Rabatt nicht
 * verlieren; jeder Teil erhält den Anteil seiner eigenen Teilnehmer.
 */
export function siblingDiscountWithinGroup(
  own: readonly SiblingDiscountParticipant[],
  others: readonly SiblingDiscountParticipant[],
): number {
  const { discountPerParticipant } = computeSiblingDiscounts([
    ...own,
    ...others,
  ]);
  return roundMoney(
    discountPerParticipant
      .slice(0, own.length)
      .reduce((sum, discount) => sum + discount, 0),
  );
}

export type PartPricing = {
  /** Summe der Kategoriepreise der Teilnehmer dieses Teils. */
  originalTotalPrice: number;
  siblingDiscountAmount: number;
  totalPrice: number;
};

type PartStatus = "CONFIRMED" | "WAITLIST" | "CANCELLED";

export type PlannedPart<P> = PartPricing & {
  status: PartStatus;
  participants: P[];
};

/**
 * Die Anmeldungen, die aus einem Absenden entstehen: eine mit `status` — oder,
 * mit Auswahl, die Gewählten bestätigt und die übrigen auf der Warteliste.
 */
export function planRegistrationParts<
  P extends { birthDate: Date; siblingGroupId?: string | null },
>(
  participants: readonly P[],
  priceOf: (participant: P) => number,
  {
    status,
    confirmedIndexes,
    withSiblingDiscount,
  }: {
    status: PartStatus;
    confirmedIndexes: readonly number[] | null;
    withSiblingDiscount: boolean;
  },
): { primary: PlannedPart<P>; waitlist: PlannedPart<P> | null } {
  const priced = participants.map((participant) => ({
    birthDate: participant.birthDate,
    siblingGroupId: participant.siblingGroupId,
    price: priceOf(participant),
  }));
  const part = (indexes: number[], partStatus: PartStatus): PlannedPart<P> => ({
    status: partStatus,
    participants: indexes.map((index) => participants[index]!),
    ...partPricing(priced, indexes, { withSiblingDiscount }),
  });

  const all = participants.map((_, index) => index);
  if (!confirmedIndexes) {
    return { primary: part(all, status), waitlist: null };
  }
  const chosen = new Set(confirmedIndexes);
  return {
    primary: part(
      all.filter((index) => chosen.has(index)),
      "CONFIRMED",
    ),
    waitlist: part(
      all.filter((index) => !chosen.has(index)),
      "WAITLIST",
    ),
  };
}

/** Rabatt über die ganze Gruppe: bestehende Gruppenteile zählen als `otherParticipants` mit. */
export function partPricing(
  participants: readonly SiblingDiscountParticipant[],
  ownIndexes: readonly number[],
  {
    withSiblingDiscount,
    otherParticipants = [],
  }: {
    withSiblingDiscount: boolean;
    otherParticipants?: readonly SiblingDiscountParticipant[];
  },
): PartPricing {
  const ownSet = new Set(ownIndexes);
  const own = participants.filter((_, index) => ownSet.has(index));
  const others = [
    ...participants.filter((_, index) => !ownSet.has(index)),
    ...otherParticipants,
  ];

  const originalTotalPrice = roundMoney(
    own.reduce((sum, participant) => sum + participant.price, 0),
  );
  const siblingDiscountAmount = withSiblingDiscount
    ? siblingDiscountWithinGroup(own, others)
    : 0;

  return {
    originalTotalPrice,
    siblingDiscountAmount,
    totalPrice: roundMoney(originalTotalPrice - siblingDiscountAmount),
  };
}
