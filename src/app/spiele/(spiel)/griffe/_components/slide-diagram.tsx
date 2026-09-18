"use client";

import { cn } from "@/lib/utils";
import { GAME_FOCUS_RING } from "../../../_lib/focus-ring";
import { formatSlideLabel } from "../_lib/fingering-lookup";
import type { DiagramFlash } from "./diagram-flash";
import { diagramShellClass } from "./diagram-flash";

/** Auflösung nach falscher Antwort: richtig UND Spieler-Eingabe zeigen. */
export type SlideReveal = {
  /** Korrektes Token (z. B. `2+`, `*1`) — mit Tinte gefüllt. */
  correct: string;
  /** Spieler-Token — rot markiert („“ bei Timeout). */
  player: string;
};

export type SlideDiagramProps = {
  position: number | null;
  register: "high" | "neutral" | "low";
  quart: boolean;
  /** Auflösung: richtige Position in Tinte, Spieler-Position rot. */
  reveal?: SlideReveal | null;
  /** Quartventil-Umschalter anzeigen (nur Fortgeschritten sinnvoll). */
  showQuart?: boolean;
  onChange: (next: {
    position: number;
    register: "high" | "neutral" | "low";
    quart: boolean;
  }) => void;
  disabled?: boolean;
  flash?: DiagramFlash;
  className?: string;
};

const POSITIONS = [1, 2, 3, 4, 5, 6, 7] as const;

function parseToken(token: string | null): {
  position: number | null;
  register: "high" | "neutral" | "low";
  quart: boolean;
} {
  if (!token) {
    return { position: null, register: "neutral", quart: false };
  }
  const t = token.trim().toLowerCase();
  const quart = t.startsWith("*");
  const rest = quart ? t.slice(1) : t;
  const m = rest.match(/^([1-7])([+-])?$/);
  if (!m) return { position: null, register: "neutral", quart: false };
  const position = m[1] ? Number(m[1]) : null;
  const sign = m[2];
  let register: "high" | "neutral" | "low" = "neutral";
  if (sign === "+") register = "high";
  if (sign === "-") register = "low";
  return { position, register, quart };
}

export function buildTromboneToken(args: {
  position: number;
  register: "high" | "neutral" | "low";
  quart: boolean;
}): string {
  const p = String(args.position);
  if (args.quart) return `*${p}`;
  if (args.register === "high") return `${p}+`;
  if (args.register === "low") return `${p}-`;
  return p;
}

export function SlideDiagram({
  position,
  register,
  quart,
  reveal = null,
  showQuart = true,
  onChange,
  disabled = false,
  flash = "none",
  className,
}: SlideDiagramProps) {
  const revealing = reveal != null;
  const correctParsed = revealing ? parseToken(reveal.correct) : null;
  const playerParsed = revealing ? parseToken(reveal.player) : null;
  const correctPos = correctParsed?.position ?? null;
  const playerPos = playerParsed?.position ?? null;

  const locked = disabled || revealing;

  const registerButtonClass = (active: boolean) =>
    cn(
      "min-h-11 border px-4 py-2 text-sm font-bold transition active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
      GAME_FOCUS_RING,
      active
        ? "on-orange border-primary bg-primary text-ink"
        : "border-rule text-ink hover:border-ink dark:border-night-rule dark:text-night-text dark:hover:border-night-text",
    );

  return (
    <div
      className={cn(
        "border p-[clamp(0.5rem,1.6dvh,1rem)] transition-colors duration-200",
        diagramShellClass(flash),
        className,
      )}
    >
      <div
        className="relative mx-auto w-full max-w-xl"
        role="group"
        aria-label="Griffdiagramm: Zugposition 1 bis 7 wählen"
      >
        <div className="mb-[clamp(0.5rem,1.6dvh,1rem)] flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={locked}
            aria-pressed={register === "high"}
            onClick={() => {
              if (position == null) return;
              onChange({
                position,
                register: register === "high" ? "neutral" : "high",
                quart,
              });
            }}
            className={registerButtonClass(register === "high")}
          >
            Hoch
          </button>
          <button
            type="button"
            disabled={locked}
            aria-pressed={register === "low"}
            onClick={() => {
              if (position == null) return;
              onChange({
                position,
                register: register === "low" ? "neutral" : "low",
                quart,
              });
            }}
            className={registerButtonClass(register === "low")}
          >
            Tief
          </button>
          {showQuart && (
            <button
              type="button"
              disabled={locked}
              aria-pressed={quart}
              onClick={() => {
                if (position == null) return;
                onChange({ position, register, quart: !quart });
              }}
              className={registerButtonClass(quart)}
            >
              Quartventil
            </button>
          )}
        </div>

        <div className="border-rule bg-paper dark:border-night-rule dark:bg-night-raised border px-4 py-[clamp(0.5rem,1.4dvh,1rem)]">
          <div className="flex items-center justify-between">
            <span className="text-dark dark:text-night-muted text-xs font-bold">
              Zugposition
            </span>
            <span className="text-ink dark:text-night-text text-[clamp(1rem,2.2dvh,1.5rem)] font-bold tabular-nums">
              {position ?? "—"}
            </span>
          </div>

          <input
            type="range"
            min={1}
            max={7}
            step={1}
            value={position ?? 1}
            disabled={locked}
            onChange={(e) => {
              const next = Number(e.target.value);
              onChange({ position: next, register, quart });
            }}
            className={cn(
              // 44px hoch, nicht 8: der Schieber ist ein Klickziel wie jedes
              // andere, auch wenn die Schiene dünn gezeichnet wird.
              "accent-primary mt-1 h-11 w-full cursor-pointer",
              GAME_FOCUS_RING,
              locked && "opacity-70",
            )}
            aria-label="Zugposition 1 bis 7"
          />

          <div className="mt-2 flex justify-between gap-1">
            {POSITIONS.map((pos) => {
              const isCurrent = position === pos;
              const isRevealCorrect = revealing && correctPos === pos;
              const isRevealPlayerWrong =
                revealing && playerPos === pos && correctPos !== pos;
              return (
                <button
                  key={pos}
                  type="button"
                  disabled={locked}
                  aria-pressed={isCurrent}
                  aria-label={
                    isRevealCorrect
                      ? `Zugposition ${pos} — richtige Position`
                      : isRevealPlayerWrong
                        ? `Zugposition ${pos} — deine Eingabe, falsch`
                        : `Zugposition ${pos}`
                  }
                  onClick={() => onChange({ position: pos, register, quart })}
                  className={cn(
                    "min-h-[clamp(44px,6dvh,56px)] flex-1 border text-[clamp(0.875rem,2dvh,1.25rem)] font-bold tabular-nums transition motion-reduce:transition-none",
                    GAME_FOCUS_RING,
                    isRevealCorrect
                      ? "border-ink bg-ink text-paper dark:border-night-text dark:bg-night-text dark:text-night"
                      : isRevealPlayerWrong
                        ? "border-red-600 bg-transparent text-red-700 dark:border-red-400 dark:text-red-400"
                        : isCurrent
                          ? "on-orange border-primary bg-primary text-ink"
                          : "text-ink hover:border-ink dark:text-night-text dark:hover:border-night-text border-transparent",
                  )}
                >
                  {pos}
                </button>
              );
            })}
          </div>

          {revealing && (
            <p className="text-dark dark:text-night-muted mt-3 text-center text-xs font-bold">
              <span className="text-ink dark:text-night-text">
                Richtig: {formatSlideLabel(reveal.correct)}
              </span>
              {" · "}
              <span className="text-red-700 dark:text-red-400">
                Deine Antwort:{" "}
                {reveal.player ? formatSlideLabel(reveal.player) : "—"}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
