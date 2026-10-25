"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

export type PersistedStateStorage = "session" | "local";

function storageFor(kind: PersistedStateStorage): Storage | null {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    // Privater Modus oder blockierte Site-Daten.
    return null;
  }
}

function readStored<T>(
  key: string | null,
  kind: PersistedStateStorage,
): T | undefined {
  if (key === null || typeof window === "undefined") return undefined;
  try {
    const raw = storageFor(kind)?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * `useState`, das seinen Wert unter `key` ablegt. Standard ist `sessionStorage`:
 * Filter und Seite überleben den Abstecher in eine Detailseite und zurück, nicht
 * aber das Schließen des Tabs. `key: null` schaltet das Speichern ab.
 *
 * Liest im Initialisierer statt in einem Effekt, damit die erste Abfrage schon mit
 * den gespeicherten Filtern läuft. Das Dashboard rendert erst nach der Sitzungs-
 * prüfung, also nie auf dem Server — ein Hydration-Unterschied entsteht nicht.
 */
export function usePersistedState<T>(
  key: string | null,
  initial: T | (() => T),
  storage: PersistedStateStorage = "session",
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const stored = readStored<T>(key, storage);
    if (stored !== undefined) return stored;
    return typeof initial === "function" ? (initial as () => T)() : initial;
  });

  const skipFirstWrite = useRef(true);
  useEffect(() => {
    // Der Ausgangswert muss nicht zurückgeschrieben werden.
    if (skipFirstWrite.current) {
      skipFirstWrite.current = false;
      return;
    }
    if (key === null) return;
    try {
      storageFor(storage)?.setItem(key, JSON.stringify(value));
    } catch {
      // Speicher voll oder gesperrt — dann eben nur für diese Ansicht.
    }
  }, [key, storage, value]);

  return [value, setValue];
}
