"use client";

import { useRef, useState, type ReactNode } from "react";
import { ZoomIn } from "lucide-react";
import ImageLightbox from "@/app/_components/general/image-lightbox";
import { zoomLabel } from "@/lib/image-zoom";
import { cn } from "@/lib/utils";

export interface ZoomableImageProps {
  /** Bildquelle für die Lightbox — in der Regel dieselbe wie im Rahmen. */
  src: string;
  /** Alternativtext; steht in der Lightbox auch als Bildunterschrift. */
  alt: string;
  copyright?: string | null;
  creator?: string | null;
  /** Klassen des Rahmens, ohne Anzeige-Klasse: `block` setzt die Komponente selbst. */
  className?: string;
  /** Lupe in der Ecke bei Hover und Fokus; `false` für kleine oder runde Bildfelder (Personenfotos). */
  hint?: boolean;
  /** Das Bild selbst (`next/image` mit `fill` o. ä.). */
  children: ReactNode;
}

/**
 * Macht den Bildrahmen zum Button, der die Lightbox öffnet. Nicht für Bilder, die
 * selbst Links sind (Karten, Karussell, Suchergebnisse).
 */
export default function ZoomableImage({
  src,
  alt,
  copyright,
  creator,
  className,
  hint = true,
  children,
}: ZoomableImageProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={zoomLabel(alt)}
        className={cn("group relative block cursor-zoom-in", className)}
      >
        {children}
        {hint ? (
          // Tintenfeld statt halbtransparenter Fläche: bleibt auf hellen wie
          // dunklen Fotos lesbar, ohne Verlauf oder Schatten.
          <span
            aria-hidden
            className="bg-ink text-paper absolute right-0 bottom-0 flex h-9 w-9 items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            <ZoomIn className="h-5 w-5" />
          </span>
        ) : null}
      </button>
      {open ? (
        <ImageLightbox
          src={src}
          alt={alt}
          copyright={copyright}
          creator={creator}
          returnFocusRef={buttonRef}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
