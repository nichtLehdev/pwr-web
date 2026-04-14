"use client";

import { cn } from "@/lib/utils";
import type { DiagramFlash } from "./diagram-flash";
import { diagramShellClass } from "./diagram-flash";

export type SlideDiagramProps = {
  position: number | null;
  register: "high" | "neutral" | "low";
  quart: boolean;
  /** Auflösung: korrekte Kombination hervorheben (Token wie `2+`, `2-`, `*1`). */
  forcedToken?: string | null;
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
  position: string | null;
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
  const position = m[1] ?? null;
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
  forcedToken = null,
  onChange,
  disabled = false,
  flash = "none",
  className,
}: SlideDiagramProps) {
  const forced = forcedToken ? parseToken(forcedToken) : null;
  const forcedPos = forced?.position ? Number(forced.position) : null;
  const forcedReg = forced?.register ?? null;
  const forcedQuart = forced?.quart ?? null;

  const effectivePos = forcedPos ?? position;
  const effectiveReg = forcedReg ?? register;
  const effectiveQuart = forcedQuart ?? quart;

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
            disabled={disabled || forcedToken != null}
            onClick={() => {
              if (effectivePos == null) return;
              onChange({
                position: effectivePos,
                register: effectiveReg === "high" ? "neutral" : "high",
                quart: effectiveQuart,
              });
            }}
            className={cn(
              "rounded-sm border px-3 py-2 text-sm font-bold transition",
              effectiveReg === "high"
                ? "border-primary bg-primary text-white"
                : "border-dark-border text-dark dark:text-dark-text",
            )}
          >
            Hoch
          </button>
          <button
            type="button"
            disabled={disabled || forcedToken != null}
            onClick={() => {
              if (effectivePos == null) return;
              onChange({
                position: effectivePos,
                register: effectiveReg === "low" ? "neutral" : "low",
                quart: effectiveQuart,
              });
            }}
            className={cn(
              "rounded-sm border px-3 py-2 text-sm font-bold transition",
              effectiveReg === "low"
                ? "border-primary bg-primary text-white"
                : "border-dark-border text-dark dark:text-dark-text",
            )}
          >
            Tief
          </button>
          <button
            type="button"
            disabled={disabled || forcedToken != null}
            onClick={() => {
              if (effectivePos == null) return;
              onChange({ position: effectivePos, register: effectiveReg, quart: !effectiveQuart });
            }}
            className={cn(
              "rounded-sm border px-3 py-2 text-sm font-bold transition",
              effectiveQuart
                ? "border-primary bg-primary text-white"
                : "border-dark-border text-dark dark:text-dark-text",
            )}
          >
            Quartventil
          </button>
        </div>

        <div className="border-dark-border/50 dark:border-dark-border rounded-sm border bg-white/60 px-4 py-4 dark:bg-dark-surface/50">
          <div className="flex items-center justify-between">
            <span className="text-dark dark:text-dark-text-muted text-xs font-bold">
              Zugposition
            </span>
            <span className="text-dark dark:text-dark-text text-sm font-black tabular-nums">
              {effectivePos ?? "—"}
            </span>
          </div>

          <input
            type="range"
            min={1}
            max={7}
            step={1}
            value={effectivePos ?? 1}
            disabled={disabled || forcedToken != null}
            onChange={(e) => {
              const next = Number(e.target.value);
              onChange({ position: next, register: effectiveReg, quart: effectiveQuart });
            }}
            className={cn(
              "mt-3 w-full",
              "accent-primary",
              "h-2 cursor-pointer",
              (disabled || forcedToken != null) && "opacity-70",
            )}
            aria-label="Zugposition 1 bis 7"
          />

          <div className="mt-2 flex justify-between px-1">
            {POSITIONS.map((p) => (
              <span
                key={p}
                className={cn(
                  "text-dark dark:text-dark-text-muted text-xs font-bold tabular-nums",
                  effectivePos === p && "text-primary dark:text-primary-light",
                )}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
