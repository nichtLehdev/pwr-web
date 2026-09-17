"use client";

import Image from "next/image";
import { useEffect } from "react";
import { XIcon } from "lucide-react";
import MediaCredit from "@/app/_components/general/media-credit";

interface ImageLightboxProps {
  src: string;
  alt: string;
  copyright?: string | null;
  creator?: string | null;
  onClose: () => void;
}

export default function ImageLightbox({
  src,
  alt,
  copyright,
  creator,
  onClose,
}: ImageLightboxProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
    return () => {
      document.body.style.overflow = "unset";
      document.body.classList.remove("modal-open");
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="text-paper hover:bg-paper hover:text-ink absolute top-4 right-4 z-10 flex h-11 w-11 items-center justify-center transition-colors"
        aria-label="Schließen"
      >
        <XIcon className="h-6 w-6" aria-hidden />
      </button>

      {/* Image */}
      <div
        className="flex flex-1 items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={src}
          alt={alt}
          width={1920}
          height={1080}
          className="h-auto max-h-[80vh] w-auto max-w-full object-contain"
        />
      </div>

      {/* Caption (alt) & credit */}
      {alt || copyright || creator ? (
        <div className="text-paper flex flex-wrap items-end justify-between gap-x-4 gap-y-1 px-4 pb-4 text-sm">
          {alt ? <p className="max-w-3xl">{alt}</p> : <span />}
          {copyright || creator ? (
            <MediaCredit
              copyright={copyright}
              creator={creator}
              variant="light"
              showCreatorIcon
              className="text-right"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
