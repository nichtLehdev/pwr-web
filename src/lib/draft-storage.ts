/**
 * Formular-Entwürfe als versionierter Umschlag `{ v, savedAt, data }` im localStorage.
 * Schlüssel pro Benutzer, damit geteilte Rechner keinen fremden Entwurf wiederherstellen.
 */

const PREFIX = "pwr.draft.v1";

/** Entwürfe, die älter sind, werden nicht mehr angeboten. */
export const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type StoredDraft<T> = {
  data: T;
  /** Zeitpunkt des letzten Speicherns (epoch ms). */
  savedAt: number;
};

type DraftEnvelope = {
  v: number;
  savedAt: number;
  data: unknown;
};

type ReadOptions = {
  version: number;
  maxAgeMs?: number;
  now?: number;
};

export function draftKey(userId: string, name: string): string {
  return `${PREFIX}:${userId}:${name}`;
}

function storage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    // Zugriff kann durch Browser-Einstellungen komplett blockiert sein.
    return null;
  }
}

function safeRemove(store: Storage, key: string): void {
  try {
    store.removeItem(key);
  } catch {
    /* nichts zu tun */
  }
}

function parseEnvelope(raw: string | null): DraftEnvelope | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const envelope = parsed as Partial<DraftEnvelope>;
    if (typeof envelope.v !== "number") return null;
    if (typeof envelope.savedAt !== "number") return null;
    if (!Number.isFinite(envelope.savedAt)) return null;
    if (envelope.data === undefined || envelope.data === null) return null;
    return envelope as DraftEnvelope;
  } catch {
    return null;
  }
}

/** Unlesbare, versionsfremde und abgelaufene Einträge werden dabei entfernt. */
export function readDraft<T>(
  key: string,
  { version, maxAgeMs = DRAFT_MAX_AGE_MS, now = Date.now() }: ReadOptions,
): StoredDraft<T> | null {
  const store = storage();
  if (!store) return null;

  let raw: string | null;
  try {
    raw = store.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;

  const envelope = parseEnvelope(raw);
  if (!envelope) {
    safeRemove(store, key);
    return null;
  }

  if (envelope.v !== version || now - envelope.savedAt > maxAgeMs) {
    safeRemove(store, key);
    return null;
  }

  return { data: envelope.data as T, savedAt: envelope.savedAt };
}

/**
 * `false`, wenn nicht gespeichert werden konnte (Kontingent, Privatmodus) — die
 * Oberfläche muss das anzeigen, sonst hält der Benutzer seine Eingaben für gesichert.
 */
export function writeDraft(
  key: string,
  data: unknown,
  { version, now = Date.now() }: { version: number; now?: number },
): boolean {
  const store = storage();
  if (!store) return false;

  const envelope: DraftEnvelope = { v: version, savedAt: now, data };
  try {
    store.setItem(key, JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}

export function removeDraft(key: string): void {
  const store = storage();
  if (!store) return;
  safeRemove(store, key);
}

/** Schlüssel des Autosave-Standes vor Einführung des Umschlag-Formats. */
const LEGACY_KEY_PATTERNS = [
  /^(post|event|course)-new$/,
  /^newsletter-compose$/,
  /^(post|event|course)-.+-edit$/,
  /^course-mail-.+$/,
];

function isLegacyKey(key: string): boolean {
  return LEGACY_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/** Entfernt abgelaufene, versionsfremde und Alt-Format-Entwürfe; liefert deren Anzahl. */
export function sweepDrafts({
  version,
  maxAgeMs = DRAFT_MAX_AGE_MS,
  now = Date.now(),
}: ReadOptions): number {
  const store = storage();
  if (!store) return 0;

  const stale: string[] = [];
  try {
    // Rückwärts: removeItem verschiebt die Indizes der folgenden Einträge.
    for (let i = store.length - 1; i >= 0; i--) {
      const key = store.key(i);
      if (!key) continue;

      if (isLegacyKey(key)) {
        stale.push(key);
        continue;
      }
      if (!key.startsWith(`${PREFIX}:`)) continue;

      const envelope = parseEnvelope(store.getItem(key));
      if (
        !envelope ||
        envelope.v !== version ||
        now - envelope.savedAt > maxAgeMs
      ) {
        stale.push(key);
      }
    }
  } catch {
    return 0;
  }

  for (const key of stale) safeRemove(store, key);
  return stale.length;
}

export type DraftWriteAction = "skip" | "write" | "remove";

export type DraftWriteState = {
  /** Serialisierter aktueller Formularstand. */
  next: string;
  /** Serialisierter Stand des letzten Schreibvorgangs. */
  lastWritten: string;
  /** Serialisierter Ausgangszustand (leeres Formular bzw. Serverdaten). */
  baseline: string | null;
  /** Stand zum Zeitpunkt von `clear()`, sonst `null`. */
  suspendedAt: string | null;
  /** Es wartet ein gefundener Entwurf auf die Entscheidung des Benutzers. */
  pending: boolean;
};

/**
 * 1. Solange ein gefundener Entwurf angeboten wird, nicht schreiben (er würde überschrieben).
 * 2. Nach `clear()` den unveränderten Stand nicht wieder anlegen; erst eine Änderung speichert.
 * 3. Im Ausgangszustand den Entwurf entfernen statt speichern.
 */
export function decideDraftWrite({
  next,
  lastWritten,
  baseline,
  suspendedAt,
  pending,
}: DraftWriteState): { action: DraftWriteAction; clearSuspension: boolean } {
  if (pending) return { action: "skip", clearSuspension: false };

  if (suspendedAt !== null && next === suspendedAt) {
    return { action: "skip", clearSuspension: false };
  }
  const clearSuspension = suspendedAt !== null;

  if (next === lastWritten) return { action: "skip", clearSuspension };
  if (next === baseline) return { action: "remove", clearSuspension };
  return { action: "write", clearSuspension };
}

/**
 * „vor 5 Minuten“ — Alter eines Entwurfs für die Wiederherstellen-Abfrage.
 */
export function formatDraftAge(
  savedAt: number,
  now: number = Date.now(),
): string {
  const seconds = Math.max(0, Math.round((now - savedAt) / 1000));
  if (seconds < 60) return "gerade eben";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `vor ${minutes} ${minutes === 1 ? "Minute" : "Minuten"}`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `vor ${hours} ${hours === 1 ? "Stunde" : "Stunden"}`;
  }

  const days = Math.floor(hours / 24);
  return `vor ${days} ${days === 1 ? "Tag" : "Tagen"}`;
}
