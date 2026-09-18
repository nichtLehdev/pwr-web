/** Gemeinsame Konstanten für den Wartungsmodus. Ohne Node-Abhängigkeiten. */
import { formatBerlin } from "./berlin-time";

export const MAINTENANCE_BYPASS_COOKIE = "pwr_maintenance_bypass";

export const MAINTENANCE_PATH = "/wartung";

export const MAINTENANCE_DEFAULT_MESSAGE =
  "Wir arbeiten gerade an der Seite und sind in Kürze wieder für Sie da.";

/**
 * Anmeldung und Dashboard bleiben offen, sonst sperrt der Wartungsmodus die aus,
 * die ihn abschalten sollen. Unter `/api/maintenance` liegt der Freischaltlink.
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
  active: boolean;
  /** Aktiv und keine Freischaltung: Dieser Aufrufer sieht die Wartungsseite. */
  blocked: boolean;
  message: string;
  until: string | null;
}

/**
 * In deutscher Ortszeit, denn der Server rendert in UTC. `null` ohne oder mit
 * unbrauchbarem Wert.
 */
export function formatMaintenanceUntil(iso: string | null): string | null {
  if (!iso) return null;
  return formatBerlin(iso, "datumVollUhrzeit") || null;
}
