import "server-only";

import { db } from "@/server/db";
import { auth } from "@/server/better-auth";
import { resolveUserPermissionsCached } from "@/server/api/helpers/permissions";
import {
  MAINTENANCE_BYPASS_COOKIE,
  MAINTENANCE_DEFAULT_MESSAGE,
  type MaintenanceVerdict,
} from "@/lib/maintenance";
import { createLogger } from "@/server/utils/logger";

const log = createLogger("Maintenance");

/**
 * Harte Übersteuerung, unabhängig von der Datenbank — greift also auch
 * während einer Migration. Bewusst nicht in `src/env.js`: Der Wert wird zur
 * Anfragezeit gelesen, und dasselbe Image läuft auf Produktion und
 * Vorabversion.
 */
function envOverride(): boolean {
  const raw = process.env.MAINTENANCE_MODE?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}

async function dbState(): Promise<{
  enabled: boolean;
  message: string | null;
  until: Date | null;
}> {
  try {
    const row = await db.maintenanceState.findUnique({ where: { id: 1 } });
    return {
      enabled: row?.enabled ?? false,
      message: row?.message ?? null,
      until: row?.until ?? null,
    };
  } catch (error) {
    // Absichtlich "aus": Ein Datenbankfehler darf die Seite nicht für alle
    // schließen. Wer das bewusst will, nimmt MAINTENANCE_MODE.
    log.error("Wartungsstatus konnte nicht gelesen werden:", error);
    return { enabled: false, message: null, until: null };
  }
}

/** Angemeldet mit Dashboard-Zugriff, oder Freischalt-Cookie aus dem Link. */
async function hasBypass(headers: Headers): Promise<boolean> {
  const token = process.env.MAINTENANCE_BYPASS_TOKEN?.trim();
  if (token) {
    const cookie = headers.get("cookie") ?? "";
    const match = new RegExp(
      `(?:^|;\\s*)${MAINTENANCE_BYPASS_COOKIE}=([^;]*)`,
    ).exec(cookie);
    if (match?.[1] && decodeURIComponent(match[1]) === token) return true;
  }

  try {
    const session = await auth.api.getSession({ headers });
    if (!session?.user) return false;
    // Dieselbe Regel wie im Dashboard-Layout: mindestens eine Berechtigung.
    const permissions = await resolveUserPermissionsCached(session.user.id);
    return permissions.size > 0;
  } catch (error) {
    log.error("Sitzung für Wartungs-Freischaltung nicht lesbar:", error);
    return false;
  }
}

/**
 * Läuft im Proxy bei jedem Aufruf. Wartung aus kostet deshalb nur den
 * zwischengespeicherten Schalter; die Freischaltprüfung hängt an Sitzung und
 * Cookie und ist erst fällig, wenn die Seite ohnehin geschlossen ist.
 */
export async function resolveMaintenance(
  headers: Headers,
): Promise<MaintenanceVerdict> {
  const off: MaintenanceVerdict = {
    active: false,
    blocked: false,
    message: MAINTENANCE_DEFAULT_MESSAGE,
    until: null,
  };

  if (!(await isMaintenanceActive())) return off;

  const state = envOverride()
    ? { enabled: true, message: null, until: null }
    : await dbState();

  if (!state.enabled) return off;

  return {
    active: true,
    blocked: !(await hasBypass(headers)),
    message: state.message?.trim() ?? MAINTENANCE_DEFAULT_MESSAGE,
    until: state.until?.toISOString() ?? null,
  };
}

/**
 * Nur der globale Schalter. Kurz zwischengespeichert, weil `stats.recordView`
 * als öffentliche Mutation bei jedem Seitenaufruf hier vorbeikommt.
 */
const ACTIVE_CACHE_TTL_MS = 5_000;
let activeCache: { value: boolean; at: number } | null = null;

export async function isMaintenanceActive(): Promise<boolean> {
  if (envOverride()) return true;

  const now = Date.now();
  if (activeCache && now - activeCache.at < ACTIVE_CACHE_TTL_MS) {
    return activeCache.value;
  }

  const { enabled } = await dbState();
  activeCache = { value: enabled, at: now };
  return enabled;
}

/** Nach dem Umschalten aus dem Dashboard, damit es sofort greift. */
export function clearMaintenanceCache(): void {
  activeCache = null;
}
