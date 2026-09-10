import { NextResponse, type NextRequest } from "next/server";
import { resolveMaintenance } from "@/server/maintenance";

/**
 * Laufzeit-Auskunft über den Wartungsmodus — das Gegenstück zu /api/app-env.
 *
 * Muss dynamisch sein und darf nicht zwischengespeichert werden: Der Zustand
 * kommt aus Umgebungsvariable und Datenbank und kann sich jederzeit ändern.
 * Die Middleware kann ihn nicht selbst ermitteln, weil sie in der Edge-Runtime
 * läuft und Prisma dort nicht lädt.
 *
 * Die Antwort hängt am Aufrufer: `blocked` berücksichtigt Sitzung und
 * Freischalt-Cookie, `active` nicht.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const verdict = await resolveMaintenance(request.headers);
  return NextResponse.json(verdict, {
    headers: { "Cache-Control": "no-store" },
  });
}
