"use client";

import { useEffect, useRef, useState } from "react";
import { useBanner } from "@/app/_components/ui/banner-context";
import { useStickyTop } from "@/lib/use-sticky-top";
import { cn } from "@/lib/utils";

/**
 * Kolumnentitel: Sobald der große Seitentitel nach oben aus dem Bild gelaufen
 * ist, steht er als schmaler Streifen unter der Navigation — wie der
 * Kolumnentitel auf jeder Seite eines Hefts.
 *
 * Der Streifen schwebt (`fixed`) statt zu kleben: Ein klebender Streifen
 * belegt auch unsichtbar seinen Platz im Fluss, und beim Einblenden würde der
 * Inhalt darunter springen.
 *
 * Für Vorlesegeräte ist er ausgeblendet — der Titel steht bereits als `h1` am
 * Seitenanfang, und zweimal derselbe Text hilft dort niemandem.
 */
export function PageTitleBar({ title }: { title: string }) {
  const { bannerHeight } = useBanner();
  const stickyTop = useStickyTop(bannerHeight);
  const marke = useRef<HTMLDivElement>(null);
  const [sichtbar, setSichtbar] = useState(false);

  useEffect(() => {
    const el = marke.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const beobachter = new IntersectionObserver(
      (eintraege) => {
        const eintrag = eintraege[0];
        if (!eintrag) return;
        setSichtbar(
          !eintrag.isIntersecting && eintrag.boundingClientRect.top < 0,
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

  return (
    <>
      <div ref={marke} aria-hidden className="h-px" />
      <div
        aria-hidden
        className={cn(
          "border-rule dark:border-night-rule bg-paper dark:bg-night fixed inset-x-0 z-20 border-b transition-opacity duration-150 motion-reduce:transition-none",
          sichtbar ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        style={{ top: `${stickyTop}px` }}
      >
        <div className="sheet py-3">
          <p className="condensed text-ink dark:text-night-text truncate text-xl leading-none font-bold">
            {title}
          </p>
        </div>
      </div>
    </>
  );
}
