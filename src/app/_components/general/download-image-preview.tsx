"use client";

import Image from "next/image";
import { useState } from "react";
import { Download, ImageOff } from "lucide-react";
import type { FileType } from "~/generated/prisma/enums";
import ZoomableImage from "@/app/_components/general/zoomable-image";
import { formatFileSize } from "@/app/_components/media/media-shared";
import { cn } from "@/lib/utils";
import {
  downloadAttachmentUrl,
  downloadFormatCode,
} from "@/lib/download-file-types";

export interface DownloadImagePreviewProps {
  download: {
    title: string;
    description?: string | null;
    fileUrl: string;
    fileType: FileType;
    fileSize?: number | null;
  };
}

/**
 * Bild-Download (Flyer) als `<li>` einer `WayList`. Füllt sich nicht orange wie eine Wegzeile:
 * zwei Ziele (ansehen, herunterladen). Nur für `isPreviewableImageDownload`.
 */
export function DownloadImagePreview({ download }: DownloadImagePreviewProps) {
  const format = downloadFormatCode(download);
  const size = download.fileSize ? formatFileSize(download.fileSize) : "";

  return (
    <li className="border-rule dark:border-night-rule flex items-start gap-5 border-b px-1 py-5 sm:gap-6">
      <PreviewThumbnail src={download.fileUrl} title={download.title} />
      <div className="min-w-0 flex-1">
        <p className="condensed text-ink dark:text-night-text text-[1.5rem] leading-tight font-bold break-words">
          {download.title}
        </p>
        <p className="semi-condensed text-dark dark:text-night-muted mt-1.5 flex flex-wrap gap-x-3 text-sm font-semibold">
          <span>{format}</span>
          {size ? <span>{size}</span> : null}
        </p>
        {download.description ? (
          <p className="text-dark dark:text-night-muted mt-2 max-w-[60ch] text-[0.9375rem] leading-relaxed">
            {download.description}
          </p>
        ) : null}
        {/* Ohne `target`: die Antwort ist ein Anhang, ein neuer Tab bliebe leer. */}
        <a
          href={downloadAttachmentUrl(download)}
          download
          className="semi-condensed border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night mt-4 inline-flex min-h-11 items-center gap-2 border-2 px-4 text-base font-semibold transition-colors"
        >
          <Download aria-hidden className="h-5 w-5 shrink-0" />
          Herunterladen
          <span className="sr-only">
            : {download.title} ({size ? `${format}, ${size}` : format})
          </span>
        </a>
      </div>
    </li>
  );
}

/** Hochformat nahe DIN A: Flyer füllen den Rahmen, Querformate stehen darin. */
const FRAME =
  "border-rule dark:border-night-rule bg-paper dark:bg-night-raised relative aspect-[5/7] w-24 shrink-0 border sm:w-32";

/**
 * Vorschaubild ganz gezeigt (`object-contain`), öffnet die Lightbox. Schlägt das Laden fehl
 * (etwa ein noch nicht freigegebener Download), steht ein Platzhalter.
 */
function PreviewThumbnail({ src, title }: { src: string; title: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className={cn(FRAME, "flex items-center justify-center")}>
        <ImageOff
          aria-hidden
          className="text-dark dark:text-night-muted h-6 w-6"
        />
      </span>
    );
  }

  return (
    <ZoomableImage
      src={src}
      alt={title}
      hint={false}
      className={cn(
        FRAME,
        "hover:border-ink dark:hover:border-night-text transition-colors",
      )}
    >
      <Image
        src={src}
        alt=""
        fill
        sizes="(min-width: 40rem) 8rem, 6rem"
        className="object-contain"
        onError={() => setFailed(true)}
      />
    </ZoomableImage>
  );
}
