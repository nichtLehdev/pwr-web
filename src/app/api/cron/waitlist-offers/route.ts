import { NextRequest, NextResponse } from "next/server";
import { processWaitlistPromotionOffers } from "@/server/jobs/waitlist-promotion-offers";

import { createLogger } from "@/server/utils/logger";

const log = createLogger("Cron");

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

/**
 * POST /api/cron/waitlist-offers
 *
 * Schließt abgelaufene Nachrück-Angebote — die Plätze gehen an die Nächsten
 * auf der Warteliste — und erinnert das Kursteam an Angebote, die in den
 * nächsten zwei Tagen ablaufen. Läuft auch ohne SMTP: das Weitergeben der
 * Plätze darf nicht am Mailversand hängen.
 *
 * Auf mittwald über einen mStudio-Cronjob mit
 * scripts/trigger-waitlist-offers.mjs (Vorschlag: stündlich).
 * Erfordert Authorization: Bearer <CRON_SECRET>.
 */
export async function POST(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processWaitlistPromotionOffers();
    return NextResponse.json(result);
  } catch (error) {
    log.error("Waitlist offer run failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal error",
      },
      { status: 500 },
    );
  }
}

/** Allow GET for simple cron services that only support GET. */
export async function GET(request: NextRequest) {
  return POST(request);
}
