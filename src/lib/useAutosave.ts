"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DRAFT_MAX_AGE_MS,
  decideDraftWrite,
  draftKey,
  readDraft,
  removeDraft,
  type StoredDraft,
  sweepDrafts,
  writeDraft,
} from "./draft-storage";

const DEFAULT_DEBOUNCE_MS = 600;
const DEFAULT_VERSION = 1;

/** Aufräumen genügt einmal pro Seitenaufruf, nicht einmal pro Formular. */
let sweptThisPageLoad = false;

export type UseAutosaveOptions<T> = {
  /** Eindeutig pro Formular, z. B. "post-new" oder `post-${id}-edit`. */
  name: string;
  /** Muss referenziell stabil sein (`useMemo`), sonst wird bei jedem Render neu geplant. */
  data: T;
  /** Solange die Sitzung lädt (`null`/`undefined`), ist der Autosave inaktiv. */
  userId: string | null | undefined;
  /**
   * Bearbeiten-Formulare liefern `false`, bis die Serverdaten stehen — sonst
   * überschreibt der leere Anfangszustand den Entwurf, bevor er angeboten wird.
   */
  ready?: boolean;
  /** Hochzählen, wenn sich die Form von `data` ändert — ältere Entwürfe fallen dann weg. */
  version?: number;
  maxAgeMs?: number;
  debounceMs?: number;
};

export type UseAutosaveResult<T> = {
  /** Gefundener Entwurf, der auf die Entscheidung des Benutzers wartet. */
  pendingDraft: StoredDraft<T> | null;
  /** Übernimmt den Entwurf: liefert die Daten und nimmt das Speichern wieder auf. */
  restoreDraft: () => T | null;
  discardDraft: () => void;
  /** Nach Absenden oder „Abbrechen“: entfernt den Entwurf, pausiert bis zur nächsten Änderung. */
  clear: () => void;
  /** localStorage hat abgelehnt (Kontingent voll, Privatmodus) — es wird nichts gesichert. */
  storageFailed: boolean;
};

/**
 * Wiederhergestellt wird nie von selbst: die Seite fragt mit `pendingDraft` nach
 * (siehe `DraftRestorePrompt`), und bis dahin wird nicht gespeichert.
 */
export function useAutosave<T>({
  name,
  data,
  userId,
  ready = true,
  version = DEFAULT_VERSION,
  maxAgeMs = DRAFT_MAX_AGE_MS,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseAutosaveOptions<T>): UseAutosaveResult<T> {
  const key = userId ? draftKey(userId, name) : null;
  const enabled = key !== null && ready;

  const [pendingDraft, setPendingDraft] = useState<StoredDraft<T> | null>(null);
  const [storageFailed, setStorageFailed] = useState(false);

  const dataRef = useRef(data);

  /** Serialisierter Stand des letzten Schreibvorgangs. */
  const lastWrittenRef = useRef("");
  /** Serialisierter Anfangszustand (leeres Formular bzw. Serverdaten). */
  const baselineRef = useRef<string | null>(null);
  /**
   * Stand bei `clear()`; unverändert wird nicht geschrieben, sonst legt der
   * Re-Render nach dem Absenden den gelöschten Entwurf wieder an.
   */
  const suspendedAtRef = useRef<string | null>(null);
  const pendingRef = useRef(false);
  const initializedForKeyRef = useRef<string | null>(null);

  // Der verzögerte Schreibvorgang und das Schreiben beim Verlassen der Seite
  // laufen außerhalb des Renderns — sie brauchen den jeweils letzten Stand.
  useEffect(() => {
    dataRef.current = data;
    pendingRef.current = pendingDraft !== null;
  });

  useEffect(() => {
    if (sweptThisPageLoad) return;
    sweptThisPageLoad = true;
    sweepDrafts({ version, maxAgeMs });
  }, [version, maxAgeMs]);

  // Einmal pro Formular, erst nach dem Mounten: auf dem Server gibt es kein localStorage.
  useEffect(() => {
    if (!enabled || !key) return;
    if (initializedForKeyRef.current === key) return;
    initializedForKeyRef.current = key;

    const current = JSON.stringify(dataRef.current);
    baselineRef.current = current;

    const offerStoredDraft = () => {
      const stored = readDraft<T>(key, { version, maxAgeMs });
      if (!stored) return;

      if (JSON.stringify(stored.data) === current) {
        // Deckt sich mit dem, was ohnehin im Formular steht.
        removeDraft(key);
        return;
      }

      setPendingDraft(stored);
    };

    offerStoredDraft();
  }, [enabled, key, version, maxAgeMs]);

  const flush = useCallback(() => {
    if (!key) return;

    const next = JSON.stringify(dataRef.current);
    const { action, clearSuspension } = decideDraftWrite({
      next,
      lastWritten: lastWrittenRef.current,
      baseline: baselineRef.current,
      suspendedAt: suspendedAtRef.current,
      pending: pendingRef.current,
    });

    // Nach dem Leeren wieder echte Eingaben — Autosave läuft weiter.
    if (clearSuspension) suspendedAtRef.current = null;

    if (action === "skip") return;

    if (action === "remove") {
      removeDraft(key);
      lastWrittenRef.current = next;
      return;
    }

    if (writeDraft(key, dataRef.current, { version })) {
      lastWrittenRef.current = next;
      setStorageFailed(false);
    } else {
      setStorageFailed(true);
    }
  }, [key, version]);

  useEffect(() => {
    if (!enabled || pendingDraft) return;
    const timer = setTimeout(flush, debounceMs);
    return () => clearTimeout(timer);
  }, [data, enabled, pendingDraft, debounceMs, flush]);

  // Beim Verlassen der Seite bleibt keine Zeit für den Debounce — sofort schreiben.
  useEffect(() => {
    if (!enabled) return;

    const flushOnHide = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flushOnHide);

    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flushOnHide);
      flush();
    };
  }, [enabled, flush]);

  const restoreDraft = useCallback((): T | null => {
    if (!pendingDraft) return null;
    // Der Entwurf steht bereits so im Speicher — nicht gleich neu schreiben.
    lastWrittenRef.current = JSON.stringify(pendingDraft.data);
    suspendedAtRef.current = null;
    setPendingDraft(null);
    return pendingDraft.data;
  }, [pendingDraft]);

  const discardDraft = useCallback(() => {
    if (key) removeDraft(key);
    lastWrittenRef.current = "";
    setPendingDraft(null);
  }, [key]);

  const clear = useCallback(() => {
    if (key) removeDraft(key);
    lastWrittenRef.current = "";
    suspendedAtRef.current = JSON.stringify(dataRef.current);
    setPendingDraft(null);
  }, [key]);

  return useMemo(
    () => ({
      pendingDraft,
      restoreDraft,
      discardDraft,
      clear,
      storageFailed,
    }),
    [pendingDraft, restoreDraft, discardDraft, clear, storageFailed],
  );
}
