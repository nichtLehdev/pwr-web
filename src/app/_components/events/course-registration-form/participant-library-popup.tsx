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
        className="border-ink dark:border-night-text bg-paper dark:bg-night fixed top-1/2 left-1/2 z-101 w-80 max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 border-2 sm:absolute sm:top-full sm:right-0 sm:left-auto sm:z-[102] sm:mt-1 sm:max-w-md sm:translate-x-0 sm:translate-y-0"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-h-[60vh] overflow-y-auto p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="condensed text-ink dark:text-night-text font-bold">
              Gespeicherte Teilnehmer
            </h4>
            <button
              onClick={onClose}
              className="text-ink hover:bg-ink hover:text-paper dark:text-night-text dark:hover:bg-night-text dark:hover:text-night flex h-9 w-9 items-center justify-center transition-colors"
              aria-label="Schließen"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          {savedParticipants && savedParticipants.length > 0 ? (
            <>
              <ul>
                {savedParticipants.map((saved) => (
                  <li
                    key={saved.id}
                    className="border-rule dark:border-night-rule border-b"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onLoadParticipant(saved);
                      }}
                      className="fill-row flex w-full items-center justify-between px-1 py-3 text-left transition-colors"
                    >
                      <div>
                        <div className="text-ink dark:text-night-text font-medium">
                          {saved.firstName} {saved.lastName}
                        </div>
                        <div className="text-dark dark:text-night-muted text-xs">
                          {new Date(saved.birthDate).toLocaleDateString(
                            "de-DE",
                          )}
                          {saved.city && ` • ${saved.city}`}
                        </div>
                      </div>
                      <Plus className="h-4 w-4 shrink-0" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-dark dark:text-night-muted mt-3 text-xs">
                Gespeicherte Teilnehmer können Sie in den{" "}
                <a
                  href="/settings"
                  className="link-ink"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Einstellungen
                </a>{" "}
                verwalten und entfernen.
              </p>
            </>
          ) : (
            <p className="text-dark dark:text-night-muted text-sm">
              Noch keine Teilnehmer gespeichert. Sie können Teilnehmer nach dem
              Hinzufügen speichern.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
