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
 * Löschdialog mit Verwendungsnachweis.
 *
 * Der vorherige Dialog fragte nur „bist du sicher?“ und nannte nicht einmal die
 * Datei. Das war vor allem deshalb heikel, weil zwei Beziehungen auf
 * `onDelete: Cascade` stehen: mit dem Bild verschwand stillschweigend das ganze
 * Bläserheft bzw. die Karussell-Folie.
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
          <h3 className="dark:text-dark-text text-lg font-semibold text-gray-900">
            Medium löschen
          </h3>

          <div className="dark:border-dark-border flex items-center gap-3 rounded-lg border border-gray-200 p-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-gray-100 dark:bg-gray-800">
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
              <p className="dark:text-dark-text truncate font-medium text-gray-900">
                {media.name}
              </p>
              <p className="dark:text-dark-muted text-xs text-gray-500">
                {formatFileSize(media.size)}
              </p>
            </div>
          </div>

          {isLoading ? (
            <p className="dark:text-dark-muted text-sm text-gray-500">
              Verwendung wird geprüft …
            </p>
          ) : cascades.length > 0 ? (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/20">
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
            <div className="dark:border-dark-border dark:bg-dark-background rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="dark:text-dark-text text-sm font-medium text-gray-900">
                Wird an {references.length}{" "}
                {references.length === 1 ? "Stelle" : "Stellen"} verwendet
              </p>
              <ul className="dark:text-dark-muted mt-1.5 space-y-1 text-sm text-gray-600">
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
              <p className="dark:text-dark-muted mt-2 text-xs text-gray-500">
                Dort bleibt der Eintrag bestehen, verliert aber sein Bild.
              </p>
            </div>
          )}

          {!isLoading && usage?.total === 0 && (
            <p className="dark:text-dark-muted text-sm text-gray-600">
              Das Medium wird derzeit nirgendwo verwendet.
            </p>
          )}

          <p className="dark:text-dark-muted text-sm text-gray-600">
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
