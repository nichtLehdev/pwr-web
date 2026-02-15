"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

export type TrackingConsent = "none" | "anonymous" | "anonymous_and_user";

const STORAGE_KEY = "tracking_consent";

interface TrackingConsentContextValue {
  consent: TrackingConsent | null;
  setConsent: (value: TrackingConsent) => void;
  /** Clear stored choice so the banner is shown again */
  clearConsent: () => void;
  hasChosen: boolean;
}

const TrackingConsentContext =
  createContext<TrackingConsentContextValue | null>(null);

function readStored(): TrackingConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "none" || raw === "anonymous" || raw === "anonymous_and_user") {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

export function TrackingConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsentState] = useState<TrackingConsent | null>(null);

  useEffect(() => {
    setConsentState(readStored());
  }, []);

  const setConsent = useCallback((value: TrackingConsent) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore
    }
    setConsentState(value);
  }, []);

  const clearConsent = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setConsentState(null);
  }, []);

  const hasChosen = consent !== null;

  return (
    <TrackingConsentContext.Provider
      value={{
        consent,
        setConsent,
        clearConsent,
        hasChosen,
      }}
    >
      {children}
    </TrackingConsentContext.Provider>
  );
}

export function useTrackingConsent() {
  const ctx = useContext(TrackingConsentContext);
  return ctx;
}
