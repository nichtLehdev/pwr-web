"use client";

import ImageWithFallback from "@/app/_components/ui/image-with-fallback";
import { ScrollableModal } from "@/app/_components/ui/scrollable-modal";
import { Button } from "@/app/_components/ui";
import { DownloadIcon, EditIcon, XIcon } from "lucide-react";
import { useMediaDownload } from "./use-media-download";
import {
  focalPointStyle,
  formatFileSize,
  getMimeTypeIcon,
  getMimeTypeLabel,
  statusColors,
  statusLabels,
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
        <div className="dark:bg-dark-surface overflow-hidden rounded-lg bg-white">
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
              <p className="dark:text-dark-text font-medium text-gray-900">
                {media.name}
              </p>
              <p className="dark:text-dark-muted text-sm text-gray-500">
                {getMimeTypeLabel(media.mimeType)}
                {media.size ? ` · ${formatFileSize(media.size)}` : ""}
                {media.width && media.height
                  ? ` · ${media.width}×${media.height}`
                  : ""}
                {media.uploadedBy ? ` · ${media.uploadedBy.displayName}` : ""}
              </p>
              {(media.copyright ?? media.creator) && (
                <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                  {[media.copyright, media.creator].filter(Boolean).join(" · ")}
                </p>
              )}
              {media.caption && (
                <p className="dark:text-dark-text mt-2 max-w-prose text-sm text-gray-700">
                  {media.caption}
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[media.status]}`}
              >
                {statusLabels[media.status]}
              </span>
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
          className="absolute -top-3 -right-3 rounded-full bg-white p-2 shadow-lg hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>
    </ScrollableModal>
  );
}
