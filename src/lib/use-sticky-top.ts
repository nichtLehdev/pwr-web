"use client";

import { useEffect, useState } from "react";

/**
 * Misst die Navigation statt einer festen Zahl; ändert sie ihre Höhe (Breakpoint,
 * Banner, Notch), rechnet der ResizeObserver nach.
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
