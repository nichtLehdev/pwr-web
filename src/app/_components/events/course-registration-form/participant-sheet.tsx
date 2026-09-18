"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ParticipantSheetProps {
  title: string;
  subtitle?: string;
  /** X, backdrop and Escape — always closes, however incomplete the fields. */
  onClose: () => void;
  /** Footer button; separate from `onClose` so it can decline to close. Defaults to `onClose`. */
  onDone?: () => void;
  children: React.ReactNode;
}

/** Was im Fenster per Tabulator erreichbar ist. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Editing surface for one participant: full-screen on phones, a centred dialog from `sm:` up. */
export function ParticipantSheet({
  title,
  subtitle,
  onClose,
  onDone,
  children,
}: ParticipantSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus the container so Escape is caught here, not by the form's global "abort"
  // handler; not the first input, so the mobile keyboard stays shut.
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // Restore the previous value rather than clearing it, so the modal's own lock stays intact.
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
            return;
          }
          // Tab-Falle: `aria-modal` sperrt nur den Lesecursor, nicht die Tastatur.
          if (e.key === "Tab" && containerRef.current) {
            const focusables = Array.from(
              containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
            ).filter((el) => el.getClientRects().length > 0);
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (!first || !last) return;
            const active = document.activeElement;
            if (
              e.shiftKey &&
              (active === first || active === containerRef.current)
            ) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && active === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
        className="bg-paper dark:bg-night sm:border-ink dark:sm:border-night-text flex h-[100dvh] w-full flex-col outline-none sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:border-2"
      >
        <div className="border-ink dark:border-night-text bg-paper dark:bg-night flex shrink-0 items-start justify-between gap-3 border-b-2 px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h3 className="condensed text-ink dark:text-night-text truncate text-base font-extrabold sm:text-lg">
              {title}
            </h3>
            {subtitle ? (
              <p className="text-dark dark:text-night-muted mt-0.5 truncate text-xs sm:text-sm">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Teilnehmer schließen"
            className="text-ink hover:bg-ink hover:text-paper dark:text-night-text dark:hover:bg-night-text dark:hover:text-night -mr-2 flex h-11 w-11 shrink-0 items-center justify-center transition-colors"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-5 sm:px-6">
          {children}
        </div>

        <div className="border-ink dark:border-night-text bg-paper dark:bg-night shrink-0 border-t-2 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          <button
            type="button"
            onClick={onDone ?? onClose}
            className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-primary dark:text-ink dark:hover:bg-paper semi-condensed min-h-11 w-full px-4 text-sm font-semibold transition-colors"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
}
