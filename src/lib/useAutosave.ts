"use client";

import { useEffect, useRef } from "react";

/**
 * Hook to automatically save form data to localStorage and restore it on mount.
 * Clears saved data on successful submit.
 *
 * @param key - Unique key for localStorage (e.g., 'post-new', 'event-123-edit')
 * @param data - Form data to save
 * @param enabled - Whether autosave is enabled (default: true)
 */
export function useAutosave<T>(key: string, data: T, enabled = true) {
  const isInitialMount = useRef(true);
  const lastSavedRef = useRef<string>("");

  useEffect(() => {
    if (!enabled) return;

    const currentData = JSON.stringify(data);

    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Remember the initial state instead of just skipping: StrictMode
      // re-runs effects in dev, and the second run used to write the empty
      // initial state — clobbering a stored draft before restore() ran.
      lastSavedRef.current = currentData;
      return;
    }

    if (currentData === lastSavedRef.current) return;

    try {
      localStorage.setItem(key, currentData);
      lastSavedRef.current = currentData;
    } catch (error) {
      console.warn("Failed to save to localStorage:", error);
    }
  }, [key, data, enabled]);

  const restore = (): T | null => {
    if (!enabled) return null;

    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved) as T;
      }
    } catch (error) {
      console.warn("Failed to restore from localStorage:", error);
    }
    return null;
  };

  const clear = () => {
    try {
      localStorage.removeItem(key);
      lastSavedRef.current = "";
    } catch (error) {
      console.warn("Failed to clear localStorage:", error);
    }
  };

  return { restore, clear };
}
