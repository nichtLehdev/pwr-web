/**
 * Shared by form, registration and invoices. Per siblingGroupId the oldest pays full price,
 * every further sibling gets 20% off; no age limit (Förderverein rule). Ordered by birth
 * date, ties by input order; participants without a birth date are skipped.
 */

export const SIBLING_DISCOUNT_RATE = 0.2;

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export type SiblingDiscountParticipant = {
  birthDate: Date | string | null | undefined;
  siblingGroupId?: string | null;
  /** The price of this participant's selected price option. */
  price: number;
};

export type SiblingDiscountResult = {
  /** Sum of all per-participant discounts, rounded to cents. */
  totalDiscount: number;
  /** Discount per participant, index-aligned with the input array. */
  discountPerParticipant: number[];
};

export function computeSiblingDiscounts(
  participants: SiblingDiscountParticipant[],
): SiblingDiscountResult {
  const discounts = participants.map(() => 0);

  const groups = new Map<string, number[]>();
  participants.forEach((participant, index) => {
    if (!participant.siblingGroupId) return;
    const indexes = groups.get(participant.siblingGroupId) ?? [];
    indexes.push(index);
    groups.set(participant.siblingGroupId, indexes);
  });

  for (const indexes of groups.values()) {
    const eligible = indexes.filter(
      (index) => participants[index]?.birthDate != null,
    );
    if (eligible.length < 2) continue;

    const sorted = [...eligible].sort((a, b) => {
      const birthA = new Date(participants[a]?.birthDate ?? 0).getTime();
      const birthB = new Date(participants[b]?.birthDate ?? 0).getTime();
      return birthA !== birthB ? birthA - birthB : a - b;
    });

    for (const index of sorted.slice(1)) {
      const participant = participants[index];
      if (!participant) continue;
      discounts[index] = roundMoney(participant.price * SIBLING_DISCOUNT_RATE);
    }
  }

  return {
    totalDiscount: roundMoney(discounts.reduce((sum, d) => sum + d, 0)),
    discountPerParticipant: discounts,
  };
}

/**
 * When the "Geschwisterkindrabatt" checkbox is offered. Counts group sizes, not money,
 * so a free price option in the group doesn't hide it.
 */
export function hasDiscountEligibleSiblingGroup<
  T extends Pick<SiblingDiscountParticipant, "birthDate" | "siblingGroupId">,
>(participants: T[]): boolean {
  const groupSizes = new Map<string, number>();
  for (const participant of participants) {
    if (!participant.siblingGroupId || participant.birthDate == null) continue;
    groupSizes.set(
      participant.siblingGroupId,
      (groupSizes.get(participant.siblingGroupId) ?? 0) + 1,
    );
  }
  return [...groupSizes.values()].some((size) => size >= 2);
}
