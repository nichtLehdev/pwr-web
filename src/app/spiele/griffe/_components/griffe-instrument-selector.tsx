"use client";

import { cn } from "@/lib/utils";
import type { GameModeId } from "../../noten-lesen/_lib/types";
import {
  GRIFFE_DIFFICULTY_LABELS,
  GRIFFE_INSTRUMENTS,
  GRIFFE_MODE_LABELS,
  type GriffeDifficultyId,
  type GriffeInstrumentId,
} from "../_lib/types";

export type GriffeInstrumentSelectorProps = {
  instrument: GriffeInstrumentId;
  mode: GameModeId;
  difficulty: GriffeDifficultyId;
  onInstrument: (id: GriffeInstrumentId) => void;
  onMode: (m: GameModeId) => void;
  onDifficulty: (d: GriffeDifficultyId) => void;
};

function tileClass(active: boolean): string {
  return cn(
    "rounded-sm border p-3 text-center transition-colors active:scale-[0.99] md:p-4",
    active
      ? "border-primary bg-amber-50/90 dark:bg-amber-950/30"
      : "border-dark-border/50 hover:border-primary/40 dark:border-dark-border dark:hover:border-primary/35",
  );
}

export function GriffeInstrumentSelector({
  instrument,
  mode,
  difficulty,
  onInstrument,
  onMode,
  onDifficulty,
}: GriffeInstrumentSelectorProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-dark dark:text-dark-text mb-2 text-center text-sm font-bold">
          Instrument
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {GRIFFE_INSTRUMENTS.map((ins) => (
            <button
              key={ins.id}
              type="button"
              onClick={() => onInstrument(ins.id)}
              className={tileClass(instrument === ins.id)}
            >
              <span className="text-dark dark:text-dark-text font-bold">
                {ins.label}
              </span>
              <p className="text-dark dark:text-dark-text-muted mt-1 text-xs leading-snug">
                {ins.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-dark dark:text-dark-text mb-2 text-center text-sm font-bold">
          Schwierigkeit
        </p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-3">
          {(
            ["beginner", "intermediate", "advanced"] as GriffeDifficultyId[]
          ).map((id) => {
            const d = GRIFFE_DIFFICULTY_LABELS[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => onDifficulty(id)}
                className={tileClass(difficulty === id)}
              >
                <span className="text-dark dark:text-dark-text font-bold">
                  {d.title}
                </span>
                <p className="text-dark dark:text-dark-text-muted mt-1 text-xs leading-snug">
                  {d.hint}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-dark dark:text-dark-text mb-2 text-center text-sm font-bold">
          Modus
        </p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-3">
          {(["learn", "quiz", "endless"] as GameModeId[]).map((id) => {
            const m = GRIFFE_MODE_LABELS[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => onMode(id)}
                className={tileClass(mode === id)}
              >
                <span className="text-dark dark:text-dark-text font-bold">
                  {m.title}
                </span>
                <p className="text-dark dark:text-dark-text-muted mt-1 text-xs leading-snug">
                  {m.hint}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
