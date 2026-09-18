"use client";

import { useSyncExternalStore } from "react";
import { useBanner } from "./banner-context";

interface MainContentProps {
  children: React.ReactNode;
}

function subscribeCanonicalNavBarHeight(listener: () => void) {
  const mq = window.matchMedia("(min-width: 1024px)");
  mq.addEventListener("change", listener);
  return () => mq.removeEventListener("change", listener);
}

function canonicalNavBarHeightPx() {
  return window.matchMedia("(min-width: 1024px)").matches ? 80 : 64;
}

/**
 * Navbar height matching `--nav-height` (64 / 80 @ lg), in px so that the
 * inherited `--main-padding-top` resolves without `var(--nav-height)`.
 */
function useCanonicalNavBarHeightPx(): number {
  return useSyncExternalStore(
    subscribeCanonicalNavBarHeight,
    canonicalNavBarHeightPx,
    () => 64,
  );
}

export function MainContent({ children }: MainContentProps) {
  const { bannerHeight } = useBanner();
  const navHeightPx = useCanonicalNavBarHeightPx();

  // Ohne Banner reserviert die Nav zusätzlich die Notch-Fläche (safe-area-inset-top).
  const safeAreaTop =
    bannerHeight === 0 ? " + env(safe-area-inset-top, 0px)" : "";
  const paddingTop = `calc(${bannerHeight}px + ${navHeightPx}px${safeAreaTop})`;

  return (
    <main
      id="inhalt"
      // Ziel des Sprunglinks: Ohne tabIndex nimmt <main> keinen Fokus an.
      tabIndex={-1}
      className="transition-[padding-top] duration-200 focus:outline-none"
      style={{
        paddingTop,
        // Für Vollbild-Layouts (z. B. Rhythmus-Spiel): nutzbare Höhe unter Nav/Banner
        ["--main-padding-top" as string]: paddingTop,
      }}
    >
      {children}
    </main>
  );
}
