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
 * Harte Übersteuerung per Umgebungsvariable.
 *
 * Sie gilt unabhängig von der Datenbank und ist damit der Schalter für ein
 * Deployment-Fenster: Sie greift auch dann, wenn gerade migriert wird oder die
 * Datenbank nicht erreichbar ist. Ausschalten heißt hier: Stack anpassen.
 *
 * Bewusst kein Eintrag in `src/env.js`: Der Wert wird zur Anfragezeit gelesen,
 * nicht beim Start. Dasselbe Image läuft auf Produktion und Vorabversion.
 */
function envOverride(): boolean {
  const raw = process.env.MAINTENANCE_MODE?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}

/** Der Datenbank-Schalter aus dem Dashboard. Fällt bei Fehlern auf "aus" zurück. */
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
    // Absichtlich "aus": Ein Datenbankfehler darf nicht dazu führen, dass die
    // Seite plötzlich für alle zu ist. Wer die Seite bewusst schließen will,
    // hat dafür MAINTENANCE_MODE, das ohne Datenbank auskommt.
    log.error("Wartungsstatus konnte nicht gelesen werden:", error);
    return { enabled: false, message: null, until: null };
  }
}

/**
 * Darf dieser Aufrufer trotz Wartungsmodus auf die echte Seite?
 *
 * Zwei Wege: eine angemeldete Sitzung mit Dashboard-Zugriff, oder das
 * Freischalt-Cookie aus dem geheimen Link. Beides wird hier serverseitig
 * geprüft — die Middleware kann das nicht, sie sieht nur Cookie-Namen.
 */
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

/** Vollständige Auskunft für genau diese Anfrage. */
export async function resolveMaintenance(
  headers: Headers,
): Promise<MaintenanceVerdict> {
  const forced = envOverride();
  const state = forced
    ? { enabled: true, message: null, until: null }
    : await dbState();

  if (!state.enabled) {
    return {
      active: false,
      blocked: false,
      message: MAINTENANCE_DEFAULT_MESSAGE,
      until: null,
    };
  }

  return {
    active: true,
    blocked: !(await hasBypass(headers)),
    message: state.message?.trim() ?? MAINTENANCE_DEFAULT_MESSAGE,
    until: state.until?.toISOString() ?? null,
  };
}

/**
 * Nur der globale Schalter, ohne Sitzungsprüfung.
 *
 * Für Stellen, die den Zustand kennen müssen, aber keinen konkreten Aufrufer
 * haben — etwa der tRPC-Wächter, der öffentliche Schreibzugriffe sperrt.
 *
 * Kurz zwischengespeichert, weil das an heißen Pfaden hängt: `stats.recordView`
 * ist eine öffentliche Mutation und läuft bei jedem Seitenaufruf. Ohne Cache
 * käme pro Aufruf eine Abfrage dazu.
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
