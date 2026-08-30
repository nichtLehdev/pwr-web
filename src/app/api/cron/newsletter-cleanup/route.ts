import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { createLogger } from "@/server/utils/logger";

const log = createLogger("Cron");

export const dynamic = "force-dynamic";

/**
 * Unbestätigte Newsletter-Anmeldungen sind nach kurzer Zeit nur noch Datenmüll:
 * der Bestätigungslink lebt 7 Tage, danach kann die Zeile nichts mehr werden.
 * Sie trägt aber weiter eine E-Mail-Adresse, für die nie eine Einwilligung
 * zustande kam — ohne Rechtsgrundlage und entgegen der Speicherbegrenzung
 * (Art. 5 Abs. 1 lit. e DSGVO).
 *
 * 30 Tage statt 7: genug Abstand zum Ablauf des Tokens, dass eine späte
 * Bestätigung nicht ins Leere läuft, und eine runde Zahl für die
 * Datenschutzerklärung.
 */
const UNCONFIRMED_MAX_AGE_DAYS = 30;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

/**
 * POST /api/cron/newsletter-cleanup
 *
 * Löscht Anmeldungen, die nie bestätigt wurden. Aktive Abonnent:innen und
 * abgemeldete Adressen (Sperrliste) bleiben unberührt.
 *
 * In Docker über einen Compose-Cron-Service, auf mittwald über einen
 * mStudio-Cronjob mit scripts/trigger-newsletter-cleanup.mjs.
 * Erfordert Authorization: Bearer <CRON_SECRET>.
 */
export async function POST(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(
    Date.now() - UNCONFIRMED_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
  );

  try {
    const { count } = await db.newsletterSubscriber.deleteMany({
      where: {
        confirmedAt: null,
        subscribedAt: { lt: cutoff },
      },
    });

    if (count > 0) {
      log.info(
        `Newsletter cleanup removed ${count} unconfirmed sign-up(s) older than ${UNCONFIRMED_MAX_AGE_DAYS} days`,
      );
    }

    return NextResponse.json({
      deleted: count,
      olderThanDays: UNCONFIRMED_MAX_AGE_DAYS,
      cutoff: cutoff.toISOString(),
    });
  } catch (error) {
    log.error("Newsletter cleanup failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}

/** Allow GET for simple cron services that only support GET. */
export async function GET(request: NextRequest) {
  return POST(request);
}
