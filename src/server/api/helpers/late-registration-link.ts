import { TRPCError } from "@trpc/server";
import type { Prisma, PrismaClient } from "~/generated/prisma/client";
import {
  lateRegistrationLinkState,
  lateRegistrationLinkUnusableMessage,
  type LateRegistrationLinkState,
} from "@/lib/late-registration-link";
import { hashLateRegistrationToken } from "@/server/utils/late-registration-token";

type Db = PrismaClient | Prisma.TransactionClient;

/** Zustand des Links zu `token` für genau diesen Kurs; fremde oder unbekannte Tokens sind "unknown". */
export async function lateRegistrationLinkStateForToken(
  db: Db,
  courseId: string,
  token: string,
  now: Date = new Date(),
): Promise<{
  linkId: string | null;
  state: LateRegistrationLinkState | "unknown";
}> {
  const link = await db.lateRegistrationLink.findUnique({
    where: { tokenHash: hashLateRegistrationToken(token) },
    select: {
      id: true,
      courseId: true,
      usedAt: true,
      revokedAt: true,
      expiresAt: true,
    },
  });
  if (!link || link.courseId !== courseId) {
    return { linkId: null, state: "unknown" };
  }
  return { linkId: link.id, state: lateRegistrationLinkState(link, now) };
}

/** Wirft mit einer verständlichen Meldung, wenn der Link nicht (mehr) nutzbar ist. */
export async function assertLateRegistrationLinkUsable(
  db: Db,
  courseId: string,
  token: string,
): Promise<string> {
  const { linkId, state } = await lateRegistrationLinkStateForToken(
    db,
    courseId,
    token,
  );
  if (state === "open" && linkId) return linkId;
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: lateRegistrationLinkUnusableMessage(
      state === "open" ? "unknown" : state,
    ),
  });
}

/**
 * Löst den Link in der Anmelde-Transaktion ein. Bedingtes Update statt Lesen und
 * Schreiben: Zwei gleichzeitige Anmeldungen mit demselben Link bekommen so nur
 * eine Anmeldung durch. Läuft in derselben Transaktion wie die Anmeldung:
 * scheitert eines von beiden, bleibt der Link unbenutzt.
 */
export async function claimLateRegistrationLink(
  tx: Prisma.TransactionClient,
  linkId: string,
  registrationId: string,
  now: Date = new Date(),
): Promise<void> {
  const { count } = await tx.lateRegistrationLink.updateMany({
    where: {
      id: linkId,
      usedAt: null,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    data: { usedAt: now, registrationId },
  });
  if (count !== 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: lateRegistrationLinkUnusableMessage("used"),
    });
  }
}
