"use client";

import { useBanner } from "@/app/_components/ui/banner-context";
import { useStickyTop } from "@/lib/use-sticky-top";
import { useTitelVorbei } from "@/lib/use-titel-vorbei";
import { cn } from "@/lib/utils";

/**
 * Kolumnentitel unter der Navigation, sobald der Seitentitel aus dem Bild ist.
 * `fixed` statt `sticky`, sonst springt der Inhalt beim Einblenden;
 * `aria-hidden`, weil der Titel schon als `h1` dasteht.
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
        {/* Feste Höhe: `PublicPage` rechnet mit ihr (`--kolumnentitel-hoehe`). */}
        <div className="sheet flex h-11 items-center">
          <p className="condensed text-ink dark:text-night-text min-w-0 truncate text-xl leading-none font-bold">
            {title}
          </p>
        </div>
      </div>
    </>
  );
}
