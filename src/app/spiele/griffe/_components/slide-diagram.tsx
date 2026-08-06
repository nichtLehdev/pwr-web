"use client";

import { cn } from "@/lib/utils";
import { formatSlideLabel } from "../_lib/fingering-lookup";
import type { DiagramFlash } from "./diagram-flash";
import { diagramShellClass } from "./diagram-flash";

/** Auflösung nach falscher Antwort: richtig UND Spieler-Eingabe zeigen. */
export type SlideReveal = {
  /** Korrektes Token (z. B. `2+`, `*1`) — grün markiert. */
  correct: string;
  /** Spieler-Token — rot markiert („“ bei Timeout). */
  player: string;
};

export type SlideDiagramProps = {
  position: number | null;
  register: "high" | "neutral" | "low";
  quart: boolean;
  /** Auflösung: richtige Position grün, Spieler-Position rot. */
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
      "min-h-[44px] rounded-sm border px-3 py-2 text-sm font-bold transition",
      active
        ? "border-primary bg-primary text-white"
        : "border-dark-border text-dark dark:text-dark-text",
    );

  return (
    <div
      className={cn(
        "rounded-sm border p-3 transition-colors duration-200 md:p-4",
        diagramShellClass(flash),
        className,
      )}
    >
      <div
        className="relative mx-auto w-full max-w-xl"
        role="group"
        aria-label="Zugposition wählen"
      >
        <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
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

        <div className="border-dark-border/50 dark:border-dark-border dark:bg-dark-surface/50 rounded-sm border bg-white/60 px-4 py-4">
          <div className="flex items-center justify-between">
            <span className="text-dark dark:text-dark-text-muted text-xs font-bold">
              Zugposition
            </span>
            <span className="text-dark dark:text-dark-text text-sm font-black tabular-nums">
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
              "mt-3 w-full",
              "accent-primary",
              "h-2 cursor-pointer",
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
                  aria-label={`Zugposition ${pos}`}
                  onClick={() => onChange({ position: pos, register, quart })}
                  className={cn(
                    "min-h-[44px] flex-1 rounded-sm border text-sm font-bold tabular-nums transition",
                    isRevealCorrect
                      ? "border-emerald-600 bg-emerald-500 text-white dark:border-emerald-400"
                      : isRevealPlayerWrong
                        ? "border-rose-500 bg-transparent text-rose-600 dark:border-rose-400 dark:text-rose-300"
                        : isCurrent
                          ? "border-primary bg-primary text-white"
                          : "text-dark hover:border-primary/40 dark:text-dark-text-muted border-transparent",
                  )}
                >
                  {pos}
                </button>
              );
            })}
          </div>

          {revealing && (
            <p className="text-dark dark:text-dark-text-muted mt-3 text-center text-xs font-bold">
              <span className="text-emerald-700 dark:text-emerald-300">
                Richtig: {formatSlideLabel(reveal.correct)}
              </span>
              {" · "}
              <span className="text-rose-600 dark:text-rose-300">
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
