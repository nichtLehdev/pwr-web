import { isParticipantUnder18 } from "./participant-utils";

/**
 * Canonical sibling-discount rule, shared by registration create/update and
 * the invoice generator so all three always agree.
 *
 * - Participants are grouped by siblingGroupId.
 * - Only participants under 18 at `referenceDate` (normally the course start
 *   date) are eligible.
 * - In each group with 2+ eligible members, the oldest sibling pays full
 *   price; every further eligible sibling gets 20% off their price, rounded
 *   to cents per person.
 *
 * Eligible siblings are ordered by birth date ascending (tie: original array
 * order), so the result is deterministic regardless of input order.
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
  referenceDate: Date,
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
    if (indexes.length < 2) continue;

    const eligible = indexes.filter((index) => {
      const participant = participants[index];
      return (
        participant?.birthDate != null &&
        isParticipantUnder18(participant.birthDate, referenceDate)
      );
    });
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
