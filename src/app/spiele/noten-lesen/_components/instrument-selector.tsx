"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_ORDER_EXTRA,
  DIFFICULTY_ORDER_PRIMARY,
  GAME_MODE_LABELS,
  hidesInstrumentForDifficulty,
  INSTRUMENTS,
  isExtraSectionDifficulty,
  type DifficultyId,
  type GameModeId,
  type InstrumentId,
} from "../_lib/types";

export type InstrumentSelectorProps = {
  instrument: InstrumentId;
  mode: GameModeId;
  difficulty: DifficultyId;
  onInstrument: (id: InstrumentId) => void;
  onMode: (m: GameModeId) => void;
  onDifficulty: (d: DifficultyId) => void;
};

function difficultyButtonClass(active: boolean): string {
  return cn(
    "rounded-sm border p-3 text-center transition-colors active:scale-[0.99] md:p-4",
    active
      ? "border-primary bg-amber-50/90 dark:bg-amber-950/30"
      : "border-dark-border/50 hover:border-primary/40 dark:border-dark-border dark:hover:border-primary/35",
  );
}

export function InstrumentSelector({
  instrument,
  mode,
  difficulty,
  onInstrument,
  onMode,
  onDifficulty,
}: InstrumentSelectorProps) {
  const hideInstrument = hidesInstrumentForDifficulty(difficulty);
  const [extraOpen, setExtraOpen] = useState(() =>
    isExtraSectionDifficulty(difficulty),
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-dark dark:text-dark-text mb-2 text-center text-sm font-bold">
          Schwierigkeit
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 md:gap-3">
          {DIFFICULTY_ORDER_PRIMARY.map((id) => {
            const d = DIFFICULTY_LABELS[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onDifficulty(id);
                  setExtraOpen(false);
                }}
                className={difficultyButtonClass(difficulty === id)}
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

        <div className="border-dark-border/50 dark:border-dark-border mt-4 overflow-hidden rounded-sm border">
          <button
            type="button"
            onClick={() => setExtraOpen((o) => !o)}
            aria-expanded={extraOpen}
            className="text-dark dark:text-dark-text hover:bg-background-secondary/80 dark:hover:bg-dark-background/50 flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-bold transition-colors"
          >
            <span>
              Weitere Modi (Altschlüssel, Tenorschlüssel, Hardcore)
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 transition-transform",
                extraOpen && "rotate-180",
              )}
              aria-hidden
            />
          </button>
          {!extraOpen && isExtraSectionDifficulty(difficulty) && (
            <p className="text-dark dark:text-dark-text-muted border-dark-border/40 border-t px-3 py-2 text-center text-xs dark:border-dark-border/60">
              Gewählt:{" "}
              <span className="text-dark dark:text-dark-text font-bold">
                {DIFFICULTY_LABELS[difficulty].title}
              </span>
            </p>
          )}
          {extraOpen && (
            <div className="border-dark-border/40 space-y-2 border-t p-3 dark:border-dark-border/60">
              <p className="text-dark dark:text-dark-text-muted text-center text-[11px] leading-snug">
                Altschlüssel und Tenorschlüssel (Anfänger/Mittel) sowie Hardcore
                — ohne Instrumentwahl.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 md:gap-3">
                {DIFFICULTY_ORDER_EXTRA.map((id) => {
                  const d = DIFFICULTY_LABELS[id];
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        onDifficulty(id);
                        setExtraOpen(true);
                      }}
                      className={difficultyButtonClass(difficulty === id)}
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
          )}
        </div>
      </div>

      <div>
        <p className="text-dark dark:text-dark-text mb-2 text-center text-sm font-bold">
          Modus
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:gap-3">
          {(Object.keys(GAME_MODE_LABELS) as GameModeId[]).map((id) => {
            const m = GAME_MODE_LABELS[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => onMode(id)}
                className={cn(
                  "rounded-sm border p-3 text-center transition-colors active:scale-[0.99] md:p-4",
                  mode === id
                    ? "border-primary bg-amber-50/90 dark:bg-amber-950/30"
                    : "border-dark-border/50 hover:border-primary/40 dark:border-dark-border dark:hover:border-primary/35",
                )}
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

      {!hideInstrument && (
        <div>
          <p className="text-dark dark:text-dark-text mb-2 text-center text-sm font-bold">
            Instrument
          </p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
            {INSTRUMENTS.map((ins) => (
              <button
                key={ins.id}
                type="button"
                onClick={() => onInstrument(ins.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-sm border p-3 text-center transition-colors active:scale-[0.99] md:p-3.5",
                  instrument === ins.id
                    ? "border-primary bg-amber-50/90 dark:bg-amber-950/30"
                    : "border-dark-border/50 hover:border-primary/40 bg-transparent dark:border-dark-border dark:hover:border-primary/35",
                )}
              >
                <span className="text-dark dark:text-dark-text font-bold leading-tight">
                  {ins.label}
                </span>
                <span className="text-dark dark:text-dark-text-muted text-[11px] leading-snug">
                  {ins.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
