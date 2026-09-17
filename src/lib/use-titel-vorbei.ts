"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Meldet, ob der große Seitentitel nach oben aus dem Bild gelaufen ist.
 *
 * Gemeinsame Grundlage für den Kolumnentitel (`PageTitleBar`) und für die
 * Seiten, die eine eigene klebende Leiste mitbringen (Termine, Aktuelles):
 * Dort soll der Titel in der Leiste erst auftauchen, wenn der große Titel
 * vorbei ist — sonst steht derselbe Text zweimal untereinander.
 *
 * Die zurückgegebene Marke gehört als leeres 1px-Element genau an die Stelle,
 * ab der „vorbei“ gelten soll — also direkt hinter den Seitenkopf.
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
        // Verglichen wird gegen `stickyTop`, nicht gegen die Fensterkante:
        // Das Sichtfeld ist per `rootMargin` um genau diesen Betrag
        // verkleinert, die Marke steht beim Überqueren also noch bei rund
        // `stickyTop`. Ein Vergleich gegen 0 verpasst diesen Moment — und
        // danach meldet sich der Beobachter nicht wieder, weil der
        // Schnittzustand unverändert bleibt.
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
