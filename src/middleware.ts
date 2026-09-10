import { NextResponse, type NextRequest } from "next/server";
import {
  MAINTENANCE_PATH,
  isInfrastructurePath,
  isMaintenanceAllowedPath,
  type MaintenanceVerdict,
} from "@/lib/maintenance";

/**
 * Wartungsmodus.
 *
 * Die Middleware läuft in der Edge-Runtime; Prisma lädt dort nicht (die
 * generierte Client-Datei importiert `node:path` und `node:process`). Der
 * Zustand kommt deshalb über `/api/maintenance`, das in der Node-Runtime läuft
 * — dasselbe Muster, mit dem das Beta-Banner sein `APP_ENV` zur Laufzeit holt.
 *
 * Zwei Stufen, damit der Normalbetrieb nichts kostet:
 *
 *  1. Der globale Schalter wird kurz zwischengespeichert. Ist die Wartung aus
 *     — der Regelfall — kostet eine Anfrage nichts weiter.
 *  2. Erst wenn sie an ist, wird pro Anfrage geprüft, ob dieser Aufrufer
 *     freigeschaltet ist. Das lässt sich nicht cachen, weil es an Sitzung und
 *     Cookie hängt. In dem Zustand ist die Seite ohnehin geschlossen.
 */

/** Wie lange der globale Schalter zwischengespeichert wird. */
const CACHE_TTL_MS = 5_000;

let cached: { active: boolean; at: number } | null = null;

async function fetchVerdict(
  request: NextRequest,
  forwardCookies: boolean,
): Promise<MaintenanceVerdict | null> {
  try {
    const url = new URL("/api/maintenance", request.nextUrl.origin);
    const response = await fetch(url, {
      headers: forwardCookies
        ? { cookie: request.headers.get("cookie") ?? "" }
        : {},
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as MaintenanceVerdict;
  } catch {
    // Kein Netz zur eigenen Route: Die Seite bleibt offen. Ein Fehler hier darf
    // nicht dazu führen, dass unabsichtlich alles dichtmacht.
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isInfrastructurePath(pathname) || isMaintenanceAllowedPath(pathname)) {
    return NextResponse.next();
  }

  const now = Date.now();
  if (!cached || now - cached.at > CACHE_TTL_MS) {
    const verdict = await fetchVerdict(request, false);
    if (!verdict) return NextResponse.next();
    cached = { active: verdict.active, at: now };
  }

  if (!cached.active) return NextResponse.next();

  // Wartung ist an — jetzt zählt der einzelne Aufrufer.
  const verdict = await fetchVerdict(request, true);
  if (!verdict?.blocked) return NextResponse.next();

  // Rewrite statt Redirect: Die angefragte Adresse bleibt in der Adresszeile
  // stehen, und wer die Seite später neu lädt, landet wieder auf der Seite,
  // die er eigentlich wollte.
  const response = NextResponse.rewrite(
    new URL(MAINTENANCE_PATH, request.url),
    { status: 503 },
  );
  response.headers.set("Retry-After", "3600");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  /**
   * Statische Assets und Bilder gar nicht erst anfassen. Die feinere
   * Unterscheidung passiert oben in `isMaintenanceAllowedPath`, damit sie
   * mit den Server-Routen dieselbe Liste teilt.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
