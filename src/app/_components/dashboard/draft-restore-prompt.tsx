"use client";

import { AlertTriangleIcon, HistoryIcon } from "lucide-react";
import { formatDraftAge } from "@/lib/draft-storage";
import { cn } from "@/lib/utils";

type DraftRestorePromptProps = {
  /** Gefundener Entwurf aus `useAutosave`, oder `null`. */
  draft: { savedAt: number } | null;
  onRestore: () => void;
  onDiscard: () => void;
  /** Es kann nicht zwischengespeichert werden (Kontingent voll, Privatmodus). */
  storageFailed?: boolean;
  className?: string;
};

/**
 * Fragt nach, bevor ein zwischengespeicherter Entwurf ins Formular
 * übernommen wird.
 *
 * Früher wurde still wiederhergestellt: die Felder füllten sich mit altem
 * Inhalt, ohne Hinweis woher und ohne Möglichkeit, neu anzufangen — beim
 * Bearbeiten hätte das außerdem fremde Änderungen am Server überdeckt.
 */
export function DraftRestorePrompt({
  draft,
  onRestore,
  onDiscard,
  storageFailed = false,
  className,
}: DraftRestorePromptProps) {
  if (!draft && !storageFailed) return null;

  return (
    <div className={cn("mb-6 space-y-3", className)}>
      {draft && (
        <div
          role="status"
          className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <HistoryIcon className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  Nicht gespeicherter Entwurf gefunden
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Zuletzt {formatDraftAge(draft.savedAt)} auf diesem Gerät
                  zwischengespeichert. Möchtest du dort weitermachen?
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={onRestore}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Übernehmen
              </button>
              <button
                type="button"
                onClick={onDiscard}
                className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-800 transition-colors hover:bg-blue-100 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-900/40"
              >
                Verwerfen
              </button>
            </div>
          </div>
        </div>
      )}

      {storageFailed && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20"
        >
          <AlertTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Deine Eingaben können auf diesem Gerät nicht zwischengespeichert
            werden (Speicher voll oder privater Modus). Bei einem Neuladen gehen
            sie verloren.
          </p>
        </div>
      )}
    </div>
  );
}
