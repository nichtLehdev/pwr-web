"use client";

import { api } from "@/trpc/react";
import ImageWithFallback from "@/app/_components/ui/image-with-fallback";
import { Button } from "@/app/_components/ui";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";
import { AlertTriangleIcon } from "lucide-react";
import {
  formatFileSize,
  getMimeTypeIcon,
  type MediaItem,
} from "./media-shared";

/**
 * Löschdialog mit Verwendungsnachweis: zwei Beziehungen stehen auf `onDelete: Cascade`,
 * mit dem Bild verschwinden Bläserheft bzw. Karussell-Folie.
 */
export function MediaDeleteDialog({
  media,
  onClose,
  onConfirm,
  isDeleting,
}: {
  media: MediaItem;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  const { data: usage, isLoading } = api.media.getUsage.useQuery({
    id: media.id,
  });

  const cascades = usage?.usages.filter((entry) => entry.cascade) ?? [];
  const references = usage?.usages.filter((entry) => !entry.cascade) ?? [];

  return (
    <ScrollableModal onClose={isDeleting ? undefined : onClose}>
      <ScrollableModalCard maxW="lg">
        <ScrollableModalBody className="space-y-4">
          <h3 className="text-ink dark:text-night-text text-lg font-semibold">
            Medium löschen
          </h3>

          <div className="border-rule dark:border-night-rule flex items-center gap-3 border p-3">
            <div className="bg-rule/25 dark:bg-night-raised relative h-14 w-14 shrink-0 overflow-hidden">
              {media.mimeType.startsWith("image/") ? (
                <ImageWithFallback
                  src={media.url}
                  alt={media.name}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-2xl">
                  {getMimeTypeIcon(media.mimeType)}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-ink dark:text-night-text truncate font-medium">
                {media.name}
              </p>
              <p className="text-dark dark:text-night-muted text-xs">
                {formatFileSize(media.size)}
              </p>
            </div>
          </div>

          {isLoading ? (
            <p className="text-dark dark:text-night-muted text-sm">
              Verwendung wird geprüft …
            </p>
          ) : cascades.length > 0 ? (
            <div className="border border-red-300 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/20">
              <p className="flex items-start gap-2 text-sm font-semibold text-red-800 dark:text-red-300">
                <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                Achtung: Es werden weitere Einträge mitgelöscht
              </p>
              <ul className="mt-2 space-y-1 text-sm text-red-800 dark:text-red-300">
                {cascades.map((entry, index) => (
                  <li key={`${entry.kind}-${index}`}>
                    <span className="font-medium">{entry.kind}:</span>{" "}
                    {entry.label}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-red-700 dark:text-red-400">
                Diese Einträge hängen unmittelbar an der Datei und verschwinden
                mit ihr. Tausche das Bild dort zuerst aus, wenn der Eintrag
                bleiben soll.
              </p>
            </div>
          ) : null}

          {references.length > 0 && (
            <div className="border-rule dark:border-night-rule bg-rule/25 dark:bg-night-raised border p-3">
              <p className="text-ink dark:text-night-text text-sm font-medium">
                Wird an {references.length}{" "}
                {references.length === 1 ? "Stelle" : "Stellen"} verwendet
              </p>
              <ul className="text-dark dark:text-night-muted mt-1.5 space-y-1 text-sm">
                {references.slice(0, 8).map((entry, index) => (
                  <li key={`${entry.kind}-${index}`}>
                    <span className="font-medium">{entry.kind}:</span>{" "}
                    {entry.label}
                  </li>
                ))}
                {references.length > 8 && (
                  <li>… und {references.length - 8} weitere</li>
                )}
              </ul>
              <p className="text-dark dark:text-night-muted mt-2 text-xs">
                Dort bleibt der Eintrag bestehen, verliert aber sein Bild.
              </p>
            </div>
          )}

          {!isLoading && usage?.total === 0 && (
            <p className="text-dark dark:text-night-muted text-sm">
              Das Medium wird derzeit nirgendwo verwendet.
            </p>
          )}

          <p className="text-dark dark:text-night-muted text-sm">
            Die Datei wird auch von der Festplatte entfernt. Diese Aktion kann
            nicht rückgängig gemacht werden.
          </p>
        </ScrollableModalBody>

        <ScrollableModalFooter>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isDeleting}
            >
              Abbrechen
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={onConfirm}
              disabled={isDeleting || isLoading}
              isLoading={isDeleting}
            >
              Endgültig löschen
            </Button>
          </div>
        </ScrollableModalFooter>
      </ScrollableModalCard>
    </ScrollableModal>
  );
}
