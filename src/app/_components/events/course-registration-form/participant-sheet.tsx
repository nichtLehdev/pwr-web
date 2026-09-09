"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ParticipantSheetProps {
  title: string;
  subtitle?: string;
  /** X, backdrop and Escape — always closes, however incomplete the fields. */
  onClose: () => void;
  /**
   * The footer button. Separate from `onClose` so it can decline to close and
   * reveal what is still missing instead; defaults to `onClose`.
   */
  onDone?: () => void;
  children: React.ReactNode;
}

/**
 * Editing surface for a single participant: full-screen on phones, a centred
 * dialog from `sm:` up.
 *
 * Full-screen is the point — the participant fields used to live in a card
 * inside the form's own scroll container, so on a phone they competed with the
 * step navigation for the same few hundred pixels. Here the fields get the
 * whole viewport, the body is the only thing that scrolls, and "Fertig" sits in
 * a footer that can't be scrolled away from.
 */
export function ParticipantSheet({
  title,
  subtitle,
  onClose,
  onDone,
  children,
}: ParticipantSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Moves focus off whatever opened the sheet, so Escape (below) is caught here
  // instead of bubbling on to the form's global handler, which would read it as
  // "abort the whole registration". Focusing the container rather than the
  // first input also keeps the mobile keyboard shut until a field is tapped.
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // The page behind the sheet must not scroll along. Restoring the previous
  // value rather than clearing it keeps the modal variant's own lock intact.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex bg-black/50 sm:items-center sm:justify-center sm:p-4 sm:backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
        }}
        className="dark:bg-dark-surface flex h-[100dvh] w-full flex-col bg-white outline-none sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-xl sm:shadow-2xl"
      >
        <div className="dark:border-dark-border dark:bg-dark-surface flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:rounded-t-xl sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h3 className="text-dark dark:text-dark-text truncate text-base font-bold sm:text-lg">
              {title}
            </h3>
            {subtitle ? (
              <p className="mt-0.5 truncate text-xs text-gray-600 sm:text-sm dark:text-gray-400">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Teilnehmer schließen"
            className="text-dark dark:text-dark-text dark:hover:bg-dark-background -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-5 sm:px-6">
          {children}
        </div>

        <div className="dark:border-dark-border dark:bg-dark-background-secondary shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:rounded-b-xl sm:px-6">
          <button
            type="button"
            onClick={onDone ?? onClose}
            className="bg-primary hover:bg-primary-dark min-h-11 w-full rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
}
