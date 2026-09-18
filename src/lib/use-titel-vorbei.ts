"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Ob der große Seitentitel oben aus dem Bild ist, damit klebende Leisten ihn erst dann
 * zeigen. Die Marke als leeres 1px-Element direkt hinter den Seitenkopf setzen.
 */
export function useTitelVorbei(stickyTop: number) {
  const marke = useRef<HTMLDivElement>(null);
  const [vorbei, setVorbei] = useState(false);

  useEffect(() => {
    const el = marke.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const beobachter = new IntersectionObserver(
      (eintraege) => {
        const eintrag = eintraege[0];
        if (!eintrag) return;
        // Gegen `stickyTop`, nicht 0: Das Sichtfeld ist per `rootMargin` verkleinert.
        // Gegen 0 verpasst man das Überqueren, und der Beobachter meldet sich nicht wieder.
        setVorbei(
          !eintrag.isIntersecting && eintrag.boundingClientRect.top < stickyTop,
        );
      },
      {
        // Die Marke gilt als „weg“, sobald sie hinter die Navigation rutscht.
        rootMargin: `-${Math.round(stickyTop)}px 0px 0px 0px`,
        threshold: 0,
      },
    );
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, [stickyTop]);

  return { marke, vorbei };
}
