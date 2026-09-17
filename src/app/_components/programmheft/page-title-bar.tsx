"use client";

import { useBanner } from "@/app/_components/ui/banner-context";
import { useStickyTop } from "@/lib/use-sticky-top";
import { useTitelVorbei } from "@/lib/use-titel-vorbei";
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
  const { marke, vorbei } = useTitelVorbei(stickyTop);

  return (
    <>
      <div ref={marke} aria-hidden className="h-px" />
      <div
        aria-hidden
        className={cn(
          "border-rule dark:border-night-rule bg-paper dark:bg-night fixed inset-x-0 z-20 border-b transition-opacity duration-150 motion-reduce:transition-none",
          vorbei ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        style={{ top: `${stickyTop}px` }}
      >
        {/* Feste Höhe statt Polster um die Zeile: `PublicPage` rechnet mit
            genau dieser Höhe (`--kolumnentitel-hoehe`), damit mitlaufende
            Abschnittsköpfe unter dem Streifen stehen bleiben. */}
        <div className="sheet flex h-11 items-center">
          <p className="condensed text-ink dark:text-night-text min-w-0 truncate text-xl leading-none font-bold">
            {title}
          </p>
        </div>
      </div>
    </>
  );
}
