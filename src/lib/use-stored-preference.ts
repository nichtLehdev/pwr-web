"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * `localStorage` meldet Änderungen nur an *andere* Tabs — dieser Tab braucht
 * deshalb einen eigenen Verteiler.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * `useSyncExternalStore` statt Effekt: der Server liefert die Vorgabe, und React weiß,
 * dass die erste Client-Ausgabe abweichen darf. `isValid` verwirft veraltete Werte.
 */
export function useStoredPreference<T extends string>(
  storageKey: string,
  fallback: T,
  isValid: (value: string) => value is T,
): [T, (next: T) => void] {
  const read = useCallback((): T => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored !== null && isValid(stored) ? stored : fallback;
    } catch {
      // Privater Modus oder blockierte Site-Daten: dann eben die Vorgabe.
      return fallback;
    }
  }, [storageKey, fallback, isValid]);

  const value = useSyncExternalStore(subscribe, read, () => fallback);

  const update = useCallback(
    (next: T) => {
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        // Nicht speicherbar — dann bleibt es bei der Vorgabe.
      }
      listeners.forEach((listener) => listener());
    },
    [storageKey],
  );

  return [value, update];
}
