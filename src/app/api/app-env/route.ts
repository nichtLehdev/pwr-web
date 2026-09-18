import { NextResponse } from "next/server";
import { env } from "@/env";

/**
 * Laufzeit-Auskunft, ob hier eine Vorab-Umgebung läuft. Muss dynamisch sein:
 * Dasselbe Image läuft auf Produktion und Pre-Release, der Build friert Env-Werte ein.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { isPreRelease: env.APP_ENV !== "production" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
