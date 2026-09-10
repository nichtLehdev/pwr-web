import { NextResponse, type NextRequest } from "next/server";
import { MAINTENANCE_BYPASS_COOKIE, MAINTENANCE_PATH } from "@/lib/maintenance";

/**
 * Freischaltlink: /api/maintenance/bypass?token=<MAINTENANCE_BYPASS_TOKEN>
 *
 * Setzt ein Cookie, das die echte Seite auch ohne Anmeldung sichtbar macht —
 * aber nur zum Ansehen, Schreibzugriffe bleiben gesperrt. `?token=aus` löscht
 * es wieder.
 */
export function GET(request: NextRequest) {
  const expected = process.env.MAINTENANCE_BYPASS_TOKEN?.trim();
  const provided = request.nextUrl.searchParams.get("token")?.trim();

  if (provided === "aus") {
    const response = NextResponse.redirect(
      new URL(MAINTENANCE_PATH, request.url),
    );
    response.cookies.delete(MAINTENANCE_BYPASS_COOKIE);
    return response;
  }

  // Ohne konfiguriertes Token gibt es keinen Freischaltlink. Sonst würde ein
  // leerer Vergleich jeden durchlassen.
  if (!expected || !provided || provided !== expected) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(MAINTENANCE_BYPASS_COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
