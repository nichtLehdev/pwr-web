import { NextResponse } from "next/server";
import { env } from "@/env";

/**
 * Laufzeit-Auskunft, ob hier eine Vorab-Umgebung läuft (Beta-Banner & Co.).
 *
 * Muss dynamisch sein: statisch vorgerenderte Seiten (u. a. das komplette
 * /dashboard) frieren serverseitig gelesene Env-Werte zum Build-Zeitpunkt ein.
 * Da dasselbe Image auf Produktion und Pre-Release läuft, kann die Antwort
 * erst zur Anfragezeit stimmen.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { isPreRelease: env.APP_ENV !== "production" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
