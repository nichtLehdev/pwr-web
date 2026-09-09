"use client";

import { X, Plus } from "lucide-react";
import type { RouterOutputs } from "@/trpc/react";

interface ParticipantLibraryPopupProps {
  isOpen: boolean;
  onClose: () => void;
  savedParticipants: RouterOutputs["savedParticipants"]["getAll"] | undefined;
  onLoadParticipant: (
    saved: RouterOutputs["savedParticipants"]["getAll"][0],
  ) => void;
}

export function ParticipantLibraryPopup({
  isOpen,
  onClose,
  savedParticipants,
  onLoadParticipant,
}: ParticipantLibraryPopupProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - only on mobile */}
      <div
        className="fixed inset-0 z-100 bg-black/20 sm:hidden"
        onClick={onClose}
      />
      {/* Popup */}
      {/* Centred on a phone, anchored under its button from sm: up. It used to
          be placed with an inline `top: headerHeight + 80px` kept in sync by a
          resize listener — a measurement of the form header, which on the page
          layout scrolls away and so said nothing about where the popup should
          sit. */}
      <div
        className="fixed top-1/2 left-1/2 z-101 w-80 max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-gray-200 bg-white shadow-xl sm:absolute sm:top-full sm:right-0 sm:left-auto sm:z-[102] sm:mt-1 sm:max-w-md sm:translate-x-0 sm:translate-y-0 dark:border-gray-700 dark:bg-gray-800"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-h-[60vh] overflow-y-auto p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-dark dark:text-dark-text font-semibold">
              Gespeicherte Teilnehmer
            </h4>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Schließen"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {savedParticipants && savedParticipants.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-2">
                {savedParticipants.map((saved) => (
                  <button
                    key={saved.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLoadParticipant(saved);
                    }}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {saved.firstName} {saved.lastName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(saved.birthDate).toLocaleDateString("de-DE")}
                        {saved.city && ` • ${saved.city}`}
                      </div>
                    </div>
                    <Plus className="h-4 w-4 text-gray-400" />
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Gespeicherte Teilnehmer können Sie in den{" "}
                <a
                  href="/settings"
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Einstellungen
                </a>{" "}
                verwalten und entfernen.
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Noch keine Teilnehmer gespeichert. Sie können Teilnehmer nach dem
              Hinzufügen speichern.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
