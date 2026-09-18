"use client";

import { cn } from "@/lib/utils";
import { GAME_FOCUS_RING } from "../../../_lib/focus-ring";
import type { DiagramFlash } from "./diagram-flash";
import { diagramShellClass } from "./diagram-flash";

/** Auflösung nach falscher Antwort: richtig UND Spieler-Eingabe zeigen. */
export type ValveReveal = {
  /** Korrekte Ventile („1“…„4“) — mit Tinte gefüllt. */
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

/** Ventilknöpfe bleiben rund; Größe folgt Fensterhöhe (schmal: Breite). */
const VALVE_SIZE =
  "h-[clamp(60px,min(14dvh,18vw),150px)] w-[clamp(60px,min(14dvh,18vw),150px)]";

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
      role="group"
      aria-label={`Griffdiagramm: ${valveCount} Ventile`}
      className={cn(
        "border p-[clamp(0.75rem,2dvh,1.5rem)] transition-colors duration-200",
        diagramShellClass(flash),
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-center gap-[clamp(0.75rem,2.2dvh,2rem)]">
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
              // Der Name muss ohne Blick auf den Bildschirm tragen: in der
              // Auflösung sagt er, wofür der Knopf dort gerade steht.
              aria-label={
                revealing
                  ? isCorrect
                    ? `Ventil ${n} — richtiger Griff`
                    : isPlayerWrong
                      ? `Ventil ${n} — deine Eingabe, falsch`
                      : `Ventil ${n}`
                  : `Ventil ${n}`
              }
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full border-[3px] text-[clamp(1.125rem,2.6dvh,2rem)] font-bold tabular-nums transition-all active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100",
                VALVE_SIZE,
                GAME_FOCUS_RING,
                revealing
                  ? isCorrect
                    ? "border-ink bg-ink text-paper dark:border-night-text dark:bg-night-text dark:text-night"
                    : isPlayerWrong
                      ? "border-red-600 bg-transparent text-red-700 dark:border-red-400 dark:text-red-400"
                      : "border-rule bg-paper text-ink dark:border-night-rule dark:bg-night-raised dark:text-night-text"
                  : currentSet.has(key)
                    ? "on-orange border-primary bg-primary text-ink"
                    : "border-rule bg-paper text-ink hover:border-ink dark:border-night-rule dark:bg-night-raised dark:text-night-text dark:hover:border-night-text",
                (disabled || revealing) && "opacity-90",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      {revealing && (
        <p className="text-dark dark:text-night-muted mt-[clamp(0.5rem,1.4dvh,1rem)] text-center text-xs font-bold">
          <span className="text-ink dark:text-night-text">
            Gefüllt = richtiger Griff
          </span>
          {" · "}
          <span className="text-red-700 dark:text-red-400">
            Rot umrandet = deine Eingabe
          </span>
        </p>
      )}
    </div>
  );
}
