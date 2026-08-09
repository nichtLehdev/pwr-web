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
  /**
   * Der zu sichernde Formularstand.
   *
   * Muss referenziell stabil sein (`useMemo`) — sonst wird bei jedem Render
   * neu geplant und der Entwurf erst geschrieben, wenn das Rendern zur Ruhe
   * kommt.
   */
  data: T;
  /**
   * Entwürfe werden pro Benutzer getrennt gespeichert. Solange die Sitzung
   * noch lädt (`null`/`undefined`), ist der Autosave inaktiv.
   */
  userId: string | null | undefined;
  /**
   * Das Formular ist befüllt und der Autosave darf laufen.
   *
   * Bearbeiten-Formulare müssen hier `false` liefern, bis die Serverdaten in
   * den Feldern stehen: sonst überschreibt der leere Anfangszustand den
   * gespeicherten Entwurf, bevor er überhaupt angeboten werden kann.
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
  /** Verwirft den gefundenen Entwurf. */
  discardDraft: () => void;
  /**
   * Entfernt den Entwurf und hält das Speichern an (nach erfolgreichem
   * Absenden oder bei „Abbrechen“). Sobald sich das Formular danach wieder
   * ändert, läuft der Autosave weiter.
   */
  clear: () => void;
  /** localStorage hat abgelehnt (Kontingent voll, Privatmodus) — es wird nichts gesichert. */
  storageFailed: boolean;
};

/**
 * Sichert einen Formularstand lokal und bietet ihn beim nächsten Aufruf zur
 * Wiederherstellung an.
 *
 * Wiederhergestellt wird nie von selbst: `pendingDraft` beschreibt den Fund,
 * die Seite fragt damit nach (siehe `DraftRestorePrompt`). Solange die Frage
 * offen ist, wird nicht gespeichert — sonst überschriebe der aktuelle
 * (leere) Formularstand genau den Entwurf, über den noch entschieden wird.
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
   * Stand zum Zeitpunkt von `clear()`. Solange sich daran nichts ändert, wird
   * nicht geschrieben — sonst legt der Re-Render direkt nach dem Absenden den
   * gerade gelöschten Entwurf wieder an.
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

  // Einmal pro Formular: Anfangszustand merken und nach einem Entwurf sehen.
  // Der Blick in den Speicher geht erst nach dem Mounten — beim Rendern auf
  // dem Server gibt es kein localStorage.
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

  // Beim Schließen des Tabs und beim Verlassen der Seite bleibt für den
  // Debounce keine Zeit mehr — hier sofort schreiben.
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
