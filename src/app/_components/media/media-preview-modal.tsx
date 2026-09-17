"use client";

import ImageWithFallback from "@/app/_components/ui/image-with-fallback";
import { ScrollableModal } from "@/app/_components/ui/scrollable-modal";
import { Button } from "@/app/_components/ui";
import { ContentStatusBadge } from "@/app/_components/dashboard/content-status";
import { DownloadIcon, EditIcon, XIcon } from "lucide-react";
import { useMediaDownload } from "./use-media-download";
import {
  focalPointStyle,
  formatFileSize,
  getMimeTypeIcon,
  getMimeTypeLabel,
  type MediaItem,
} from "./media-shared";

export function MediaPreviewModal({
  media,
  onClose,
  onEdit,
  canEdit,
}: {
  media: MediaItem;
  onClose: () => void;
  onEdit: () => void;
  canEdit: boolean;
}) {
  const { downloadOne } = useMediaDownload();

  return (
    <ScrollableModal onClose={onClose} className="bg-black/80">
      <div
        className="relative w-full max-w-4xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dark:bg-night-raised bg-paper overflow-hidden">
          <div className="relative flex max-h-[65vh] min-h-[240px] items-center justify-center bg-black">
            {media.mimeType.startsWith("image/") ? (
              <ImageWithFallback
                src={media.url}
                alt={media.alt ?? media.name}
                width={media.width ?? 1200}
                height={media.height ?? 800}
                className="max-h-[65vh] w-auto object-contain"
                style={focalPointStyle(media)}
              />
            ) : media.mimeType.startsWith("video/") ? (
              <video src={media.url} controls className="max-h-[65vh]" />
            ) : media.mimeType.startsWith("audio/") ? (
              <audio src={media.url} controls className="w-96" />
            ) : (
              <div className="p-12 text-center text-white">
                <span className="text-6xl">
                  {getMimeTypeIcon(media.mimeType)}
                </span>
                <p className="mt-4 text-lg font-medium">{media.name}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-start justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="text-ink dark:text-night-text font-medium">
                {media.name}
              </p>
              <p className="text-dark dark:text-night-muted text-sm">
                {getMimeTypeLabel(media.mimeType)}
                {media.size ? ` · ${formatFileSize(media.size)}` : ""}
                {media.width && media.height
                  ? ` · ${media.width}×${media.height}`
                  : ""}
                {media.uploadedBy ? ` · ${media.uploadedBy.displayName}` : ""}
              </p>
              {(media.copyright ?? media.creator) && (
                <p className="text-dark dark:text-night-muted mt-1 text-xs">
                  {[media.copyright, media.creator].filter(Boolean).join(" · ")}
                </p>
              )}
              {media.caption && (
                <p className="text-ink dark:text-night-text mt-2 max-w-prose text-sm">
                  {media.caption}
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <ContentStatusBadge status={media.status} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadOne(media)}
              >
                <DownloadIcon className="mr-1.5 h-4 w-4" />
                Herunterladen
              </Button>
              {canEdit && (
                <Button variant="secondary" size="sm" onClick={onEdit}>
                  <EditIcon className="mr-1.5 h-4 w-4" />
                  Bearbeiten
                </Button>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          title="Schließen"
          aria-label="Schließen"
          className="border-ink bg-paper hover:bg-rule/60 dark:border-night-text dark:bg-night-raised dark:hover:bg-night-rule absolute -top-3 -right-3 border-2 p-2 transition-colors"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>
    </ScrollableModal>
  );
}
