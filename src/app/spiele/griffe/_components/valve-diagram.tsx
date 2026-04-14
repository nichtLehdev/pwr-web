"use client";

import { cn } from "@/lib/utils";
import type { DiagramFlash } from "./diagram-flash";
import { diagramShellClass } from "./diagram-flash";

export type ValveDiagramProps = {
  valveCount: 3 | 4;
  /** Aktuell gedrückte Ventile als „1“…„4“. */
  pressed: string[];
  /** Während Auflösung: diese Anzeige erzwingen (z. B. nach falscher Antwort). */
  forcedPressed?: string[] | null;
  onToggle: (valveNumber: number) => void;
  disabled?: boolean;
  flash?: DiagramFlash;
  className?: string;
};

function pressedSet(pressed: string[]): Set<string> {
  return new Set(pressed.map((x) => x.trim()).filter((x) => x && x !== "0"));
}

export function ValveDiagram({
  valveCount,
  pressed,
  forcedPressed = null,
  onToggle,
  disabled = false,
  flash = "none",
  className,
}: ValveDiagramProps) {
  const show = forcedPressed != null ? forcedPressed : pressed;
  const set = pressedSet(show);
  const nums = Array.from({ length: valveCount }, (_, i) => i + 1);

  return (
    <div
      className={cn(
        "rounded-sm border p-4 transition-colors duration-200 md:p-5",
        diagramShellClass(flash),
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
        {nums.map((n) => {
          const key = String(n);
          const isOn = set.has(key);
          return (
            <button
              key={n}
              type="button"
              disabled={disabled || forcedPressed != null}
              onClick={() => onToggle(n)}
              aria-pressed={isOn}
              className={cn(
                "flex h-[min(72px,18vw)] max-h-[88px] min-h-[60px] w-[min(72px,18vw)] max-w-[88px] min-w-[60px] shrink-0 items-center justify-center rounded-full border-[3px] text-xl font-black transition-all active:scale-[0.97] md:text-2xl",
                isOn
                  ? "border-primary bg-primary text-white shadow-md"
                  : "border-dark-border text-dark hover:border-primary/50 dark:border-dark-border dark:bg-dark-background dark:text-dark-text dark:hover:border-primary/40 bg-white/80",
                (disabled || forcedPressed != null) && "opacity-90",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
