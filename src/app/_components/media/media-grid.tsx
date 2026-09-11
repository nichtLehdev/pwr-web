"use client";

import ImageWithFallback from "@/app/_components/ui/image-with-fallback";
import { Checkbox } from "@/app/_components/ui";
import { ContentStatus } from "~/generated/prisma/enums";
import {
  CheckIcon,
  CropIcon,
  DownloadIcon,
  EditIcon,
  TrashIcon,
} from "lucide-react";
import {
  focalPointStyle,
  formatFileSize,
  getMimeTypeIcon,
  getMimeTypeLabel,
  statusColors,
  statusLabels,
  type MediaItem,
} from "./media-shared";

/**
 * Eine Aktion in der Fußzeile der Kachel.
 *
 * Die Schaltflächen lagen früher als schwebende Leiste über dem Bild und waren
 * am Desktop bis zum Hover unsichtbar — man musste wissen, dass es sie gibt.
 * Jetzt stehen sie in einer eigenen Zeile unter den Angaben, immer sichtbar.
 */
function CardAction({
  label,
  icon: Icon,
  onClick,
  tone = "neutral",
}: {
  label: string;
  icon: typeof EditIcon;
  onClick: () => void;
  tone?: "neutral" | "success" | "danger";
}) {
  const tones = {
    neutral:
      "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100",
    success:
      "text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30",
    danger:
      "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30",
  } as const;

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`rounded-md p-1.5 transition-colors ${tones[tone]}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function MediaGrid({
  media,
  selectedIds,
  onToggleSelect,
  onPreview,
  onEdit,
  onRecrop,
  onDelete,
  onApprove,
  onDownload,
  canEdit,
  canDelete,
  canApprove,
}: {
  media: MediaItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onPreview: (item: MediaItem) => void;
  onEdit: (item: MediaItem) => void;
  onRecrop: (item: MediaItem) => void;
  onDelete: (item: MediaItem) => void;
  onApprove: (item: MediaItem) => void;
  onDownload: (item: MediaItem) => void;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {media.map((item) => {
        const isSelected = selectedIds.has(item.id);
        const isImage = item.mimeType.startsWith("image/");

        return (
          <div
            key={item.id}
            className={`dark:bg-dark-surface group relative flex flex-col overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md ${
              isSelected
                ? "border-primary ring-primary/40 ring-2"
                : "dark:border-dark-border border-gray-200"
            }`}
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => onPreview(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onPreview(item);
                }
              }}
              className="relative aspect-square cursor-pointer overflow-hidden bg-gray-100 dark:bg-gray-800"
            >
              {isImage ? (
                <ImageWithFallback
                  src={item.url}
                  alt={item.alt ?? item.name}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  style={focalPointStyle(item)}
                  sizes="(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 20vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-4xl">
                  {getMimeTypeIcon(item.mimeType)}
                </div>
              )}

              <span
                className={`absolute top-2 left-8 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[item.status]}`}
              >
                {statusLabels[item.status]}
              </span>

              {/* Ohne Alt-Text ist das Bild für Screenreader stumm — in einer
                  Übersicht, in der genau das gepflegt wird, gehört der Hinweis
                  auf die Kachel und nicht in ein Untermenü. */}
              {isImage && !item.alt && (
                <span
                  className="absolute right-2 bottom-2 rounded bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white"
                  title="Kein Alt-Text hinterlegt"
                >
                  Alt fehlt
                </span>
              )}
            </div>

            <label
              className="absolute top-2 left-2 flex cursor-pointer items-center rounded bg-white/80 p-0.5 backdrop-blur-sm dark:bg-black/50"
              onClick={(event) => event.stopPropagation()}
            >
              <Checkbox
                checked={isSelected}
                onChange={() => onToggleSelect(item.id)}
                aria-label={`${item.name} auswählen`}
              />
            </label>

            <div className="flex min-w-0 flex-1 flex-col p-3">
              <p
                className="dark:text-dark-text truncate text-sm font-medium text-gray-900"
                title={item.name}
              >
                {item.name}
              </p>
              <p className="dark:text-dark-muted text-xs text-gray-500">
                {getMimeTypeLabel(item.mimeType)}
                {item.size ? ` · ${formatFileSize(item.size)}` : ""}
              </p>

              <div className="dark:border-dark-border mt-2 flex items-center gap-0.5 border-t border-gray-100 pt-2">
                <CardAction
                  label="Herunterladen"
                  icon={DownloadIcon}
                  onClick={() => onDownload(item)}
                />
                {canEdit && (
                  <CardAction
                    label="Bearbeiten"
                    icon={EditIcon}
                    onClick={() => onEdit(item)}
                  />
                )}
                {canEdit && isImage && (
                  <CardAction
                    label="Zuschneiden"
                    icon={CropIcon}
                    onClick={() => onRecrop(item)}
                  />
                )}
                {canApprove && item.status === ContentStatus.PENDING && (
                  <CardAction
                    label="Freigeben"
                    icon={CheckIcon}
                    tone="success"
                    onClick={() => onApprove(item)}
                  />
                )}
                {canDelete && (
                  <CardAction
                    label="Löschen"
                    icon={TrashIcon}
                    tone="danger"
                    onClick={() => onDelete(item)}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
