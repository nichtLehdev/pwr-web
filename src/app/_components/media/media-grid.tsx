"use client";

import ImageWithFallback from "@/app/_components/ui/image-with-fallback";
import { Checkbox } from "@/app/_components/ui";
import { ContentStatusBadge } from "@/app/_components/dashboard/content-status";
import { ContentStatus } from "~/generated/prisma/enums";
import { cn } from "@/lib/utils";
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
      "text-dark hover:bg-rule/60 hover:text-ink dark:text-night-muted dark:hover:bg-night-rule dark:hover:text-night-text",
    success:
      "text-green-700 hover:bg-rule/60 dark:text-green-400 dark:hover:bg-night-rule",
    danger:
      "text-red-600 hover:bg-rule/60 hover:text-red-700 dark:text-red-400 dark:hover:bg-night-rule dark:hover:text-red-300",
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
      className={`p-1.5 transition-colors ${tones[tone]}`}
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
            className={cn(
              "group bg-paper dark:bg-night-raised relative flex flex-col overflow-hidden border transition-colors",
              isSelected
                ? "border-ink dark:border-night-text border-2"
                : "border-rule dark:border-night-rule",
            )}
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
              className="bg-rule/25 dark:bg-night-raised relative aspect-square cursor-pointer overflow-hidden"
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

              <ContentStatusBadge
                status={item.status}
                className="absolute top-2 left-9"
              />

              {/* Ohne Alt-Text ist das Bild für Screenreader stumm — in einer
                  Übersicht, in der genau das gepflegt wird, gehört der Hinweis
                  auf die Kachel und nicht in ein Untermenü. */}
              {isImage && !item.alt && (
                <span
                  className="text-paper dark:text-night absolute right-2 bottom-2 bg-amber-700 px-1.5 py-0.5 text-[10px] font-semibold dark:bg-amber-400"
                  title="Kein Alt-Text hinterlegt"
                >
                  Alt fehlt
                </span>
              )}
            </div>

            <label
              className="bg-paper/80 dark:bg-night/80 absolute top-2 left-2 flex cursor-pointer items-center p-0.5"
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
                className="text-ink dark:text-night-text truncate text-sm font-medium"
                title={item.name}
              >
                {item.name}
              </p>
              <p className="text-dark dark:text-night-muted text-xs">
                {getMimeTypeLabel(item.mimeType)}
                {item.size ? ` · ${formatFileSize(item.size)}` : ""}
              </p>

              <div className="border-rule dark:border-night-rule mt-2 flex items-center gap-0.5 border-t pt-2">
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
