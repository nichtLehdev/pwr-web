import {
  type Prisma,
  RegistrationStatus,
  type SiblingDiscountStatus,
} from "~/generated/prisma/client";
import type { db as database } from "@/server/db";
import { roundMoney } from "@/lib/sibling-discount";

type Db = typeof database;

type GroupMember = { id: string; registrationGroupId: string | null };

/**
 * Teilnehmer der übrigen, nicht stornierten Teile einer aufgeteilten
 * Anmeldung. Der Geschwisterkindrabatt wird über sie mitberechnet, damit ein
 * Teil ihn nicht verliert, nur weil das ältere Geschwister im anderen steht.
 */
export async function otherPartParticipants(
  db: Db | Prisma.TransactionClient,
  registration: GroupMember,
): Promise<
  Array<{
    birthDate: Date;
    siblingGroupId: string | null;
    priceOptionId: string | null;
  }>
> {
  if (!registration.registrationGroupId) return [];
  return db.participant.findMany({
    where: {
      registration: {
        registrationGroupId: registration.registrationGroupId,
        id: { not: registration.id },
        registrationStatus: { not: RegistrationStatus.CANCELLED },
      },
    },
    select: { birthDate: true, siblingGroupId: true, priceOptionId: true },
  });
}

/**
 * Die Teile, über deren Rabatt gemeinsam entschieden wird: diese Anmeldung
 * und — ist sie aufgeteilt — die übrigen nicht stornierten Teile mit
 * demselben Rabattstatus. Berechnet wurde der Rabatt über alle Teile, also
 * wird er auch für alle genehmigt oder abgelehnt.
 */
export async function siblingDiscountParts(
  db: Db,
  registration: GroupMember,
  status: SiblingDiscountStatus,
) {
  return db.courseRegistration.findMany({
    where: registration.registrationGroupId
      ? {
          OR: [
            { id: registration.id },
            {
              registrationGroupId: registration.registrationGroupId,
              siblingDiscountStatus: status,
              registrationStatus: { not: RegistrationStatus.CANCELLED },
            },
          ],
        }
      : { id: registration.id },
    select: {
      id: true,
      registrationStatus: true,
      totalPrice: true,
      originalTotalPrice: true,
      siblingDiscountAmount: true,
      _count: { select: { participants: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

/** Summen über die Teile — für die eine Mail zur Rabattentscheidung. */
export function sumDiscountParts(
  parts: ReadonlyArray<{
    totalPrice: number;
    originalTotalPrice: number | null;
    siblingDiscountAmount: number | null;
    _count: { participants: number };
  }>,
) {
  const sum = (value: (part: (typeof parts)[number]) => number) =>
    roundMoney(parts.reduce((total, part) => total + value(part), 0));
  return {
    originalTotalPrice: sum(
      (part) => part.originalTotalPrice ?? part.totalPrice,
    ),
    siblingDiscountAmount: sum((part) => part.siblingDiscountAmount ?? 0),
    totalPrice: sum((part) => part.totalPrice),
    participantCount: parts.reduce(
      (total, part) => total + part._count.participants,
      0,
    ),
  };
}
