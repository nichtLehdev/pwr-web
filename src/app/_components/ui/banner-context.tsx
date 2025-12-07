"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

interface BannerContextValue {
  /** Height of the visible banner in pixels, 0 if hidden */
  bannerHeight: number;
  /** Set the banner height (called by the banner component) */
  setBannerHeight: (height: number) => void;
  /** Whether any banner is currently visible */
  isBannerVisible: boolean;
}

const BannerContext = createContext<BannerContextValue | null>(null);

export function BannerProvider({ children }: { children: ReactNode }) {
  const [bannerHeight, setBannerHeightState] = useState(0);

  const setBannerHeight = useCallback((height: number) => {
    setBannerHeightState(height);
  }, []);

  const value = useMemo(
    () => ({
      bannerHeight,
      setBannerHeight,
      isBannerVisible: bannerHeight > 0,
    }),
    [bannerHeight, setBannerHeight],
  );

  return (
    <BannerContext.Provider value={value}>{children}</BannerContext.Provider>
  );
}

export function useBanner() {
  const context = useContext(BannerContext);
  if (!context) {
    throw new Error("useBanner must be used within a BannerProvider");
  }
  return context;
}
