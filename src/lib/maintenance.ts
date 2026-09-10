/**
 * Gemeinsame Konstanten für den Wartungsmodus — von Middleware (Edge),
 * Server-Routen (Node) und Client geteilt. Hier darf deshalb nichts stehen,
 * was Node-Module braucht.
 */

/** Cookie, das die Wartungsseite überspringt. Wird über den Freischaltlink gesetzt. */
export const MAINTENANCE_BYPASS_COOKIE = "pwr_maintenance_bypass";

/** Pfad der Wartungsseite. Muss selbst erreichbar bleiben. */
export const MAINTENANCE_PATH = "/wartung";

/** Standardtext, wenn im Dashboard keiner hinterlegt ist. */
export const MAINTENANCE_DEFAULT_MESSAGE =
  "Wir arbeiten gerade an der Seite und sind in Kürze wieder für Sie da.";

/**
 * Pfade, die auch im Wartungsmodus durchgelassen werden.
 *
 * Anmeldung und Dashboard müssen offen bleiben — sonst sperrt der
 * Wartungsmodus genau die Leute aus, die ihn wieder abschalten sollen.
 * `/api/maintenance` ist die Auskunftsroute, die die Middleware selbst
 * abfragt; wäre sie gesperrt, könnte nichts mehr entscheiden.
 */
export const MAINTENANCE_ALLOWED_PREFIXES = [
  MAINTENANCE_PATH,
  "/api/maintenance",
  "/api/auth",
  "/api/trpc",
  "/api/uploads",
  "/dashboard",
  "/login",
  "/logout",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/verify-2fa",
  "/settings",
] as const;

/** Statische Next-Assets und Dateien mit Endung nie abfangen. */
export function isInfrastructurePath(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/__nextjs") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js"
  );
}

export function isMaintenanceAllowedPath(pathname: string): boolean {
  return MAINTENANCE_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export interface MaintenanceVerdict {
  /** Wartungsmodus ist grundsätzlich aktiv. */
  active: boolean;
  /** Dieser Aufrufer sieht die Wartungsseite (also aktiv und keine Freischaltung). */
  blocked: boolean;
  message: string;
  /** ISO-Zeitstempel oder null — rein informativ. */
  until: string | null;
}
