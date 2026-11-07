"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { GAME_FOCUS_RING } from "../../../_lib/focus-ring";
import { NOTE_VALUES, type NoteValueId } from "../_lib/types";
import { NoteWeight } from "./balance-scale";

type Props = {
  ids: NoteValueId[];
  onAdd: (id: NoteValueId) => void;
  onRemoveLastOf: (id: NoteValueId) => void;
  disabled?: boolean;
  showDescriptions?: boolean;
};

export function NotePalette({
  ids,
  onAdd,
  onRemoveLastOf,
  disabled = false,
  showDescriptions = true,
}: Props) {
  const pressTimer = useRef<number | null>(null);
  // Nach ausgelöstem Long-Press darf der folgende Click die Note nicht
  // gleich wieder hinzufügen — der Click wird einmalig verschluckt.
  const longPressFired = useRef(false);

  const clearPressTimer = () => {
    if (pressTimer.current != null) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  return (
    <div
      className={cn(
        "grid gap-1.5 md:gap-2",
        ids.length <= 6 ? "grid-cols-3" : "grid-cols-5",
      )}
    >
      {ids.map((id) => {
        const def = NOTE_VALUES[id];
        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            aria-label={`${def.label} hinzufügen`}
            onClick={() => {
              if (longPressFired.current) {
                longPressFired.current = false;
                return;
              }
              onAdd(id);
            }}
            onPointerDown={() => {
              if (disabled) return;
              longPressFired.current = false;
              pressTimer.current = window.setTimeout(() => {
                longPressFired.current = true;
                onRemoveLastOf(id);
              }, 420);
            }}
            onPointerUp={clearPressTimer}
            onPointerLeave={clearPressTimer}
            onPointerCancel={clearPressTimer}
            onContextMenu={(e) => e.preventDefault()}
            className={cn(
              "border-rule dark:border-night-rule dark:bg-night-raised flex touch-manipulation flex-col items-center justify-center border p-1.5 transition-colors select-none motion-safe:active:scale-[0.98] md:p-2",
              "min-h-20",
              GAME_FOCUS_RING,
              !disabled && "hover:bg-rule/25 dark:hover:bg-night-rule",
              disabled && "opacity-60",
            )}
          >
            <svg
              viewBox="-40 -40 80 84"
              className="text-ink dark:text-night-text h-[clamp(2.5rem,6.5dvh,4rem)] w-[clamp(2.5rem,6.5dvh,4rem)]"
              aria-hidden
            >
              <NoteWeight id={id} x={0} y={0} />
            </svg>
            {showDescriptions && (
              <>
                <span
                  className={
                    "text-ink dark:text-night-text mt-1 text-center text-[11px] leading-tight font-bold hyphens-manual md:text-xs"
                  }
                >
                  {def.label}
                </span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
