"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Abonnenten gespeicherter Einstellungen. `localStorage` meldet Änderungen nur
 * an *andere* Tabs, nicht an den schreibenden — die Komponenten dieses Tabs
 * brauchen deshalb einen eigenen Verteiler.
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
 * Eine Anzeigeeinstellung, die den Besuch überdauert.
 *
 * `useSyncExternalStore` statt eines Effekts: der Server kennt `localStorage`
 * nicht und liefert immer die Vorgabe, und React weiß dadurch selbst, dass die
 * erste Client-Ausgabe davon abweichen darf.
 *
 * `isValid` entscheidet, ob ein gespeicherter Wert noch zum heutigen Code
 * passt — sonst gilt die Vorgabe. Das fängt alte Werte ab, die es einmal gab
 * und heute nicht mehr gibt.
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
