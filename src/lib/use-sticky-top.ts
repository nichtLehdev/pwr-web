"use client";

import { useEffect, useState } from "react";

/**
 * Abstand, in dem eine klebende Leiste unter der Navigation einrastet.
 *
 * Vorher stand dort eine feste Zahl (112 px mobil, 144 px ab 768 px) — die
 * Höhe der alten Kopfzeile samt Kontextleiste. Die Navigation ist heute 64
 * bzw. 80 px hoch, also blieb darüber eine Lücke, durch die die Seite
 * hindurchlief. Gemessen wird deshalb die Navigation selbst; ändert sie ihre
 * Höhe (Breakpoint, Banner, eingeblendete Notch), rechnet der
 * ResizeObserver nach.
 */
export function useStickyTop(bannerHeight = 0): number {
  const [navHeight, setNavHeight] = useState(0);

  useEffect(() => {
    const nav = document.querySelector("nav");
    if (!nav) return;

    const measure = () => setNavHeight(nav.getBoundingClientRect().height);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return bannerHeight + navHeight;
}
