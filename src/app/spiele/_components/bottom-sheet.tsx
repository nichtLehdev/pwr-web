"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GAME_FOCUS_RING } from "../_lib/focus-ring";

/** Ab so viel Zug nach unten gilt das Blatt als weggewischt. */
const SWIPE_CLOSE_PX = 80;

/**
 * Blatt von unten über dem Pfad: Erklärungen, Einstellungen, Frei üben. Schließt per Knopf,
 * Tippen daneben, Wischen am Kopf oder Escape.
 */
export function BottomSheet({
  eyebrow,
  title,
  closeLabel = "Schließen",
  labelledBy,
  onClose,
  children,
}: {
  eyebrow: string;
  /** Ohne Titel benennt `labelledBy` das Blatt, etwa eine Überschrift im Inhalt. */
  title?: string;
  closeLabel?: string;
  labelledBy?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const endDrag = (close: boolean) => {
    dragStart.current = null;
    setDragging(false);
    setDrag(0);
    if (close) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="spiel-tut-backdrop bg-ink/45 absolute inset-0"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : labelledBy}
        className="spiel-tut-sheet bg-paper dark:bg-night relative flex max-h-[88dvh] w-full max-w-xl flex-col rounded-t-[28px]"
        style={{
          transform: drag ? `translateY(${drag}px)` : undefined,
          transition: dragging ? "none" : undefined,
        }}
      >
        {/* Nur der Kopf zieht: Darunter darf der Inhalt scrollen. */}
        <div
          className="flex shrink-0 touch-none flex-col gap-3 px-5 pt-3 pb-1"
          onPointerDown={(event) => {
            if ((event.target as HTMLElement).closest("button")) return;
            dragStart.current = event.clientY;
            setDragging(true);
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (dragStart.current === null) return;
            setDrag(Math.max(0, event.clientY - dragStart.current));
          }}
          onPointerUp={() => endDrag(drag > SWIPE_CLOSE_PX)}
          onPointerCancel={() => endDrag(false)}
        >
          <div
            className="bg-rule dark:bg-night-rule mx-auto h-1.5 w-10 rounded-full"
            aria-hidden
          />
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-primary-ink dark:text-primary block text-xs font-extrabold tracking-wider uppercase">
                {eyebrow}
              </span>
              {title && (
                <h2
                  id={titleId}
                  className="text-ink dark:text-night-text text-xl leading-tight font-extrabold"
                >
                  {title}
                </h2>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "text-dark hover:text-ink dark:text-night-muted dark:hover:text-night-text -mr-2 min-h-11 shrink-0 px-2 text-sm font-extrabold",
                GAME_FOCUS_RING,
              )}
            >
              {closeLabel}
            </button>
          </div>
        </div>
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain px-5 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
          {children}
        </div>
      </div>
    </div>
  );
}
