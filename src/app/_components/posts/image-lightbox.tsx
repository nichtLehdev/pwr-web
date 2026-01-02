"use client";

import Image from "next/image";
import { useEffect } from "react";
import { XIcon } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export default function ImageLightbox({
  src,
  alt,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 rounded-lg p-2 text-white transition-colors hover:bg-white/10"
        aria-label="Schließen"
      >
        <XIcon
          className="h-8 w-8"
        />
      </button>

      {/* Image */}
      <div
        className="relative max-h-[90vh] max-w-7xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={src}
          alt={alt}
          width={1920}
          height={1080}
          className="h-auto max-h-[90vh] w-auto max-w-full rounded-lg object-contain"
        />
      </div>

      {/* Caption */}
      {alt && (
        <div className="absolute right-4 bottom-4 left-4 text-center">
          <p className="inline-block max-w-3xl rounded-lg bg-black/50 px-4 py-2 text-sm text-white backdrop-blur-sm md:text-base">
            {alt}
          </p>
        </div>
      )}
    </div>
  );
}
