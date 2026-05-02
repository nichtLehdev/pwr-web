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
 * Navbar height aligned with `--nav-height` in Navigation (64 / 80 @ lg).
 * Exposed as numeric px so `--main-padding-top` resolves when inherited (sticky `top`,
 * `scroll-margin-top`) without relying on `var(--nav-height)` outside MainContent.
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

  const paddingTop = `calc(${bannerHeight}px + ${navHeightPx}px)`;

  return (
    <main
      className="transition-[padding-top] duration-200"
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
