import { NextResponse, type NextRequest } from "next/server";
import {
  MAINTENANCE_PATH,
  isInfrastructurePath,
  isMaintenanceAllowedPath,
} from "@/lib/maintenance";
import { resolveMaintenance } from "@/server/maintenance";

/**
 * Wartungsmodus. Heißt `proxy.ts`, weil Next diese Datei damit auf Node
 * ausführt — in der Edge-Runtime lädt Prisma nicht. Ein `export const runtime`
 * lehnt Next hier ab.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isInfrastructurePath(pathname) || isMaintenanceAllowedPath(pathname)) {
    return NextResponse.next();
  }

  const verdict = await resolveMaintenance(request.headers);

  if (!verdict.active) return NextResponse.next();

  // Freischaltung erlaubt Lesen, nicht Schreiben. Für tRPC übernimmt das der
  // Wächter in `trpc.ts`; die öffentlichen REST-Routen hängen allein hier.
  const isRead = request.method === "GET" || request.method === "HEAD";
  if (!isRead) {
    return NextResponse.json(
      { error: "Maintenance", message: verdict.message },
      {
        status: 503,
        headers: {
          "x-maintenance": "active",
          "Retry-After": "3600",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  if (!verdict.blocked) {
    const response = NextResponse.next();
    response.headers.set("x-maintenance", "bypass");
    return response;
  }

  // Rewrite statt Redirect, damit die angefragte Adresse stehen bleibt.
  const response = NextResponse.rewrite(
    new URL(MAINTENANCE_PATH, request.url),
    { status: 503 },
  );
  response.headers.set("x-maintenance", "active");
  response.headers.set("Retry-After", "3600");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
