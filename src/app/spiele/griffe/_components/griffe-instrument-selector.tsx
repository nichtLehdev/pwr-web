"use client";

import { cn } from "@/lib/utils";
import type { GameModeId } from "../../noten-lesen/_lib/types";
import {
  GRIFFE_DIFFICULTY_LABELS,
  GRIFFE_INSTRUMENTS,
  GRIFFE_MODE_LABELS,
  type GriffeDifficultyChoice,
  type GriffeDifficultyId,
  type GriffeInstrumentId,
} from "../_lib/types";

export type GriffeInstrumentSelectorProps = {
  instrument: GriffeInstrumentId;
  mode: GameModeId;
  difficulty: GriffeDifficultyChoice;
  /** Aktives Notenset („Eigenes Set") — null, wenn keins gewählt ist. */
  customSetName: string | null;
  /** Z. B. „5 von 7 Noten spielbar" — Abdeckung fürs aktuelle Instrument. */
  customSetSummary: string | null;
  onInstrument: (id: GriffeInstrumentId) => void;
  onMode: (m: GameModeId) => void;
  onDifficulty: (d: GriffeDifficultyId) => void;
  onOpenLibrary: () => void;
  onRemoveCustomSet: () => void;
};

function tileClass(active: boolean): string {
  return cn(
    "rounded-sm border p-3 text-center transition-colors active:scale-[0.99] md:p-4",
    active
      ? "border-primary bg-amber-50/90 dark:bg-amber-950/30"
      : "border-dark-border/50 hover:border-primary/40 dark:border-dark-border dark:hover:border-primary/35",
  );
}

const SMALL_SECONDARY_CLASS =
  "border-dark-border/50 dark:border-dark-border text-dark dark:text-dark-text hover:border-primary/40 dark:hover:border-primary/35 rounded-sm border px-3 py-1.5 text-xs font-bold transition-colors active:scale-[0.99]";

export function GriffeInstrumentSelector({
  instrument,
  mode,
  difficulty,
  customSetName,
  customSetSummary,
  onInstrument,
  onMode,
  onDifficulty,
  onOpenLibrary,
  onRemoveCustomSet,
}: GriffeInstrumentSelectorProps) {
  const customActive = difficulty === "custom" && customSetName != null;
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
              aria-pressed={instrument === ins.id}
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
                aria-pressed={difficulty === id}
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

        {/* „Eigenes Set" aus der öffentlichen Notenset-Bibliothek. */}
        <div className="mt-2 md:mt-3">
          {customActive ? (
            <div className={cn(tileClass(true), "active:scale-100")}>
              <button
                type="button"
                onClick={onOpenLibrary}
                aria-pressed={true}
                aria-haspopup="dialog"
                className="w-full active:scale-[0.99]"
              >
                <span className="text-dark dark:text-dark-text font-bold">
                  {customSetName}
                </span>
                <p className="text-dark dark:text-dark-text-muted mt-1 text-xs leading-snug">
                  {customSetSummary}
                </p>
              </button>
              <div className="mt-2 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={onOpenLibrary}
                  aria-haspopup="dialog"
                  className={SMALL_SECONDARY_CLASS}
                >
                  Ändern
                </button>
                <button
                  type="button"
                  onClick={onRemoveCustomSet}
                  className={SMALL_SECONDARY_CLASS}
                >
                  Entfernen
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenLibrary}
              aria-pressed={false}
              aria-haspopup="dialog"
              className={cn(tileClass(false), "w-full")}
            >
              <span className="text-dark dark:text-dark-text font-bold">
                Eigenes Set …
              </span>
              <p className="text-dark dark:text-dark-text-muted mt-1 text-xs leading-snug">
                Notenset aus der öffentlichen Bibliothek wählen — gespielt
                werden alle Noten mit Griff für das gewählte Instrument
              </p>
            </button>
          )}
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
                aria-pressed={mode === id}
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
