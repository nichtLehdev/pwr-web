"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

/** Stored in localStorage; sent to stats.recordView. "none" is legacy and treated as anonymous. */
export type TrackingConsent = "none" | "anonymous" | "anonymous_and_user";

export type TrackingPreference = "anonymous" | "anonymous_and_user";

const STORAGE_KEY = "tracking_consent";

const DEFAULT_PREFERENCE: TrackingPreference = "anonymous";

interface TrackingConsentContextValue {
  /** Effective preference for linked vs anonymous-only tracking */
  preference: TrackingPreference;
  setPreference: (value: TrackingPreference) => void;
}

const TrackingConsentContext =
  createContext<TrackingConsentContextValue | null>(null);

function readStored(): TrackingPreference {
  if (typeof window === "undefined") return DEFAULT_PREFERENCE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "anonymous_and_user") return "anonymous_and_user";
    return DEFAULT_PREFERENCE;
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

export function TrackingConsentProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<TrackingPreference>(() =>
    typeof window === "undefined" ? DEFAULT_PREFERENCE : readStored(),
  );

  const setPreference = useCallback((value: TrackingPreference) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore
    }
    setPreferenceState(value);
  }, []);

  return (
    <TrackingConsentContext.Provider value={{ preference, setPreference }}>
      {children}
    </TrackingConsentContext.Provider>
  );
}

/** Consent value passed to the stats API (anonymous page views are always recorded). */
export function useTrackingConsent(): TrackingConsent {
  const ctx = useContext(TrackingConsentContext);
  return ctx?.preference ?? DEFAULT_PREFERENCE;
}

export function useTrackingPreference() {
  return useContext(TrackingConsentContext);
}
