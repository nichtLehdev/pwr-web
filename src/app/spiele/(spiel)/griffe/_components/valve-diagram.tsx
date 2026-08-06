"use client";

import { cn } from "@/lib/utils";
import { GAME_FOCUS_RING } from "../../../_lib/focus-ring";
import type { DiagramFlash } from "./diagram-flash";
import { diagramShellClass } from "./diagram-flash";

/** Auflösung nach falscher Antwort: richtig UND Spieler-Eingabe zeigen. */
export type ValveReveal = {
  /** Korrekte Ventile („1“…„4“) — grün gefüllt. */
  correct: string[];
  /** Vom Spieler gedrückte Ventile — falsche als rote Umrandung. */
  player: string[];
};

export type ValveDiagramProps = {
  valveCount: 3 | 4;
  /** Aktuell gedrückte Ventile als „1“…„4“. */
  pressed: string[];
  /** Während Auflösung: richtige Kombination und Spieler-Eingabe nebeneinander. */
  reveal?: ValveReveal | null;
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
  reveal = null,
  onToggle,
  disabled = false,
  flash = "none",
  className,
}: ValveDiagramProps) {
  const revealing = reveal != null;
  const currentSet = pressedSet(pressed);
  const correctSet = revealing ? pressedSet(reveal.correct) : null;
  const playerSet = revealing ? pressedSet(reveal.player) : null;
  const nums = Array.from({ length: valveCount }, (_, i) => i + 1);

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors duration-200 md:p-5",
        diagramShellClass(flash),
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
        {nums.map((n) => {
          const key = String(n);
          const isCorrect = correctSet?.has(key) ?? false;
          const isPlayerWrong = (playerSet?.has(key) ?? false) && !isCorrect;
          const isOn = revealing ? isCorrect : currentSet.has(key);
          return (
            <button
              key={n}
              type="button"
              disabled={disabled || revealing}
              onClick={() => onToggle(n)}
              aria-pressed={isOn}
              aria-label={`Ventil ${n}`}
              className={cn(
                "flex h-[min(72px,18vw)] max-h-[88px] min-h-[60px] w-[min(72px,18vw)] max-w-[88px] min-w-[60px] shrink-0 items-center justify-center rounded-full border-[3px] text-xl font-bold transition-all active:scale-[0.97] md:text-2xl",
                GAME_FOCUS_RING,
                revealing
                  ? isCorrect
                    ? "border-emerald-600 bg-emerald-500 text-white shadow-md dark:border-emerald-400"
                    : isPlayerWrong
                      ? "border-rose-500 bg-transparent text-rose-600 dark:border-rose-400 dark:text-rose-300"
                      : "border-dark-border text-dark dark:border-dark-border dark:bg-dark-background dark:text-dark-text bg-white/80"
                  : currentSet.has(key)
                    ? "border-primary bg-primary text-white shadow-md"
                    : "border-dark-border text-dark hover:border-primary/50 dark:border-dark-border dark:bg-dark-background dark:text-dark-text dark:hover:border-primary/40 bg-white/80",
                (disabled || revealing) && "opacity-90",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      {revealing && (
        <p className="text-dark dark:text-dark-text-muted mt-3 text-center text-xs font-bold">
          <span className="text-emerald-700 dark:text-emerald-300">
            Grün = richtiger Griff
          </span>
          {" · "}
          <span className="text-rose-600 dark:text-rose-300">
            Rot umrandet = deine Eingabe
          </span>
        </p>
      )}
    </div>
  );
}
