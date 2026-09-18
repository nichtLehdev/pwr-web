"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type RefObject } from "react";
import { XIcon } from "lucide-react";
import MediaCredit from "@/app/_components/general/media-credit";
import { isOnContainedImage } from "@/lib/image-zoom";

export interface ImageLightboxProps {
  src: string;
  alt: string;
  copyright?: string | null;
  creator?: string | null;
  onClose: () => void;
  /**
   * Bekommt beim Schließen den Fokus zurück; ohne Angabe das beim Öffnen fokussierte Element.
   * Safari fokussiert angeklickte Buttons nicht, daher reicht `ZoomableImage` den Auslöser durch.
   */
  returnFocusRef?: RefObject<HTMLElement | null>;
}

const FOCUSABLE =
  'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/**
 * Leuchtkasten für ein einzelnes Bild, ohne Beschnitt. Natives `<dialog>` mit `showModal()`
 * macht den Rest inert; den Tab-Kreis schließen wir selbst, sonst wandert er in Chromium in die Browserleiste.
 */
export default function ImageLightbox({
  src,
  alt,
  copyright,
  creator,
  onClose,
  returnFocusRef,
}: ImageLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [maxSize, setMaxSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  // Beim Einhängen festhalten, nicht im Effekt: im StrictMode läuft er doppelt,
  // und beim zweiten Mal stünde der Fokus schon auf dem Schließen-Knopf.
  const [opener] = useState<HTMLElement | null>(() =>
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  // `onClose` ist bei Aufrufern oft eine Inline-Funktion. Über die Ref bleibt
  // der Dialog beim Neurendern offen, statt dass der Effekt neu anläuft.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!dialog.open) dialog.showModal();
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");

    // Geschlossen wird über den Zustand des Aufrufers. `close` fängt Chromium ab, das
    // beim wiederholten Escape ohne Nutzeraktion ohne `cancel` schließt.
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onCloseRef.current();
    };
    const handleClose = () => onCloseRef.current();
    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("close", handleClose);

    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("close", handleClose);
      document.body.style.overflow = "";
      document.body.classList.remove("modal-open");
    };
  }, []);

  // Eigener Effekt, damit er nur beim Aushängen greift: erst dann ist der
  // Dialog aus dem DOM und der Auslöser nicht mehr inert.
  useEffect(() => {
    // Der Auslöser steht schon, wenn die Lightbox einhängt.
    const target = returnFocusRef?.current ?? opener;
    return () => {
      if (target?.isConnected) target.focus({ preventScroll: true });
    };
  }, [opener, returnFocusRef]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE),
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (!focusable.includes(document.activeElement as HTMLElement)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  // Nur ein Klick neben das Foto schließt. Das `img` füllt mit `object-contain`
  // die ganze Fläche, also zählt das Rechteck, das das Foto tatsächlich einnimmt.
  const closeOnBackdrop = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target === event.currentTarget) {
      onClose();
      return;
    }
    if (!(target instanceof HTMLImageElement)) return;
    const onImage = isOnContainedImage(
      target.getBoundingClientRect(),
      target.naturalWidth,
      target.naturalHeight,
      event.clientX,
      event.clientY,
    );
    if (!onImage) onClose();
  };

  const hasCaption = Boolean(alt || copyright || creator);

  return (
    <dialog
      ref={dialogRef}
      aria-label={alt ? `Bildansicht: ${alt}` : "Bildansicht"}
      onKeyDown={handleKeyDown}
      // `on-ink`: Fokusring in Druckorange, auch im hellen Modus — auf dem
      // Nachtgrund wäre der Tintenring unsichtbar.
      className="on-ink bg-night text-night-text backdrop:bg-night fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden border-0 p-0"
    >
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 justify-end p-2 sm:p-3">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="text-night-text hover:bg-night-text hover:text-night flex h-11 w-11 items-center justify-center transition-colors"
            aria-label="Schließen"
          >
            <XIcon className="h-6 w-6" aria-hidden />
          </button>
        </div>

        <div
          className="relative mx-4 mb-4 min-h-0 flex-1 sm:mx-14"
          onClick={closeOnBackdrop}
        >
          {/* Füllt die Fläche, aber höchstens bis zur doppelten Vorlagengröße — kleine Fotos verwaschen sonst. */}
          <div
            className="absolute inset-0 m-auto"
            style={
              maxSize
                ? { maxWidth: maxSize.width, maxHeight: maxSize.height }
                : undefined
            }
          >
            <Image
              src={src}
              alt={alt}
              fill
              loading="eager"
              sizes="100vw"
              className="object-contain"
              onLoad={(event) => {
                const img = event.currentTarget;
                setMaxSize({
                  width: img.naturalWidth * 2,
                  height: img.naturalHeight * 2,
                });
              }}
            />
          </div>
        </div>

        {hasCaption ? (
          <div className="border-night-rule flex shrink-0 flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t px-4 py-3 text-sm sm:px-14">
            {alt ? (
              <p className="text-night-text max-w-3xl">{alt}</p>
            ) : (
              <span />
            )}
            <MediaCredit
              copyright={copyright}
              creator={creator}
              variant="light"
              showCreatorIcon
              className="sm:justify-end sm:text-right"
            />
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
