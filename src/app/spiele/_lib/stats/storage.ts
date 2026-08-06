import type { GameId } from "../games";
import {
  EMPTY_AGGREGATES,
  type GameLocalState,
  type GameResultEvent,
  type GameResultInput,
} from "./types";

/**
 * Local-first-Speicher für Spielstatistiken.
 * - Pro Spiel ein versionierter localStorage-Eintrag (Bestwerte, letzte Runden).
 * - Ein gemeinsamer Postausgang (Outbox) für den späteren Server-Sync:
 *   Ergebnisse werden angehängt und nach erfolgreichem Upload entfernt.
 * Alle Zugriffe sind abgesichert — ohne Storage (z. B. Privatmodus) wird
 * einfach nichts gespeichert.
 */

const PREFIX = "pwr.spiele.v1";
const OUTBOX_KEY = `${PREFIX}.outbox`;
const RECENT_EVENTS_CAP = 50;
const OUTBOX_CAP = 200;

/** Wird bei jeder Outbox-Änderung am `window` ausgelöst — Signal für den Sync. */
export const OUTBOX_CHANGED_EVENT = "pwr:spiele-outbox-changed";

function storageAvailable(): boolean {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

function readJson<T>(key: string): T | null {
  if (!storageAvailable()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!storageAvailable()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Quota/Privatmodus — bewusst ignorieren. */
  }
}

function emptyState(): GameLocalState {
  return {
    schemaVersion: 1,
    settings: {},
    aggregates: { ...EMPTY_AGGREGATES },
    recentEvents: [],
  };
}

function gameKey(gameId: GameId): string {
  return `${PREFIX}.${gameId}`;
}

/** Defensive Normalisierung — kaputte/fremde Einträge fallen auf leer zurück. */
function normalizeState(value: unknown): GameLocalState {
  if (!value || typeof value !== "object") return emptyState();
  const v = value as Partial<GameLocalState>;
  if (v.schemaVersion !== 1) return emptyState();
  const agg = v.aggregates;
  return {
    schemaVersion: 1,
    settings:
      v.settings && typeof v.settings === "object"
        ? (v.settings as Record<string, unknown>)
        : {},
    aggregates: {
      plays: typeof agg?.plays === "number" ? agg.plays : 0,
      bestScore: typeof agg?.bestScore === "number" ? agg.bestScore : 0,
      bestStreak: typeof agg?.bestStreak === "number" ? agg.bestStreak : 0,
      lastPlayedAt:
        typeof agg?.lastPlayedAt === "string" ? agg.lastPlayedAt : null,
    },
    recentEvents: Array.isArray(v.recentEvents)
      ? (v.recentEvents as GameResultEvent[]).slice(-RECENT_EVENTS_CAP)
      : [],
  };
}

export function loadGameState(gameId: GameId): GameLocalState {
  return normalizeState(readJson<unknown>(gameKey(gameId)));
}

export function saveGameState(gameId: GameId, state: GameLocalState): void {
  writeJson(gameKey(gameId), state);
}

function newClientId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/**
 * Ergebnis festhalten: Aggregate (Max-Merge), letzte Runden und Outbox in einem
 * Schritt aktualisieren. Gibt den neuen Zustand für die Anzeige zurück.
 */
export function recordResult(
  gameId: GameId,
  input: GameResultInput,
): GameLocalState {
  const event: GameResultEvent = {
    clientId: newClientId(),
    gameId,
    playedAt: new Date().toISOString(),
    ...input,
  };

  const prev = loadGameState(gameId);
  const next: GameLocalState = {
    ...prev,
    aggregates: {
      plays: prev.aggregates.plays + 1,
      bestScore: Math.max(prev.aggregates.bestScore, event.score),
      bestStreak: Math.max(prev.aggregates.bestStreak, event.streak ?? 0),
      lastPlayedAt: event.playedAt,
    },
    recentEvents: [...prev.recentEvents, event].slice(-RECENT_EVENTS_CAP),
  };
  saveGameState(gameId, next);

  const outbox = loadOutbox();
  saveOutbox([...outbox, event].slice(-OUTBOX_CAP));
  notifyOutboxChanged();

  return next;
}

/** Server-Aggregate lokal einmischen (Bestwerte = Maximum beider Seiten). */
export function mergeServerAggregates(
  gameId: GameId,
  server: {
    plays: number;
    bestScore: number;
    bestStreak: number;
    lastPlayedAt: string | null;
  },
): GameLocalState {
  const prev = loadGameState(gameId);
  const next: GameLocalState = {
    ...prev,
    aggregates: {
      plays: Math.max(prev.aggregates.plays, server.plays),
      bestScore: Math.max(prev.aggregates.bestScore, server.bestScore),
      bestStreak: Math.max(prev.aggregates.bestStreak, server.bestStreak),
      lastPlayedAt:
        [prev.aggregates.lastPlayedAt, server.lastPlayedAt]
          .filter((d): d is string => Boolean(d))
          .sort()
          .at(-1) ?? null,
    },
  };
  saveGameState(gameId, next);
  return next;
}

export function loadOutbox(): GameResultEvent[] {
  const value = readJson<unknown>(OUTBOX_KEY);
  return Array.isArray(value) ? (value as GameResultEvent[]) : [];
}

export function saveOutbox(events: GameResultEvent[]): void {
  writeJson(OUTBOX_KEY, events.slice(-OUTBOX_CAP));
}

/** Erfolgreich hochgeladene Ergebnisse aus der Outbox entfernen. */
export function removeFromOutbox(clientIds: readonly string[]): void {
  if (clientIds.length === 0) return;
  const remaining = loadOutbox().filter((e) => !clientIds.includes(e.clientId));
  saveOutbox(remaining);
  notifyOutboxChanged();
}

function notifyOutboxChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OUTBOX_CHANGED_EVENT));
}
