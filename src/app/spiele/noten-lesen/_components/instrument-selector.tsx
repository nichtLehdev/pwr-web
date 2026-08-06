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
  /** Aktives eigenes Notenset (Custom-Schwierigkeit) — sonst null. */
  customSet: { name: string; noteCount: number } | null;
  /** Persistiertes/verlinktes Set wird noch aufgelöst („Lädt …“-Kachel). */
  customPending: { name: string | null } | null;
  /** Einzeiliger Hinweis unter der Set-Kachel (z. B. „Set gibt es nicht mehr“). */
  customNotice: string | null;
  onInstrument: (id: InstrumentId) => void;
  onMode: (m: GameModeId) => void;
  onDifficulty: (d: DifficultyId) => void;
  /** Notenset-Bibliothek öffnen (Kachel bzw. „Ändern“). */
  onOpenLibrary: () => void;
  /** Eigenes Set entfernen → zurück zur zuletzt gewählten Preset-Stufe. */
  onRemoveCustomSet: () => void;
};

function difficultyButtonClass(active: boolean): string {
  return cn(
    "rounded-sm border p-3 text-center transition-colors active:scale-[0.99] md:p-4",
    active
      ? "border-primary bg-amber-50/90 dark:bg-amber-950/30"
      : "border-dark-border/50 hover:border-primary/40 dark:border-dark-border dark:hover:border-primary/35",
  );
}

const SMALL_ACTION_BUTTON_CLASS =
  "border-dark-border/50 dark:border-dark-border text-dark dark:text-dark-text hover:border-primary/40 dark:hover:border-primary/35 rounded-sm border px-3 py-1.5 text-xs font-bold transition-colors active:scale-[0.99]";

export function InstrumentSelector({
  instrument,
  mode,
  difficulty,
  customSet,
  customPending,
  customNotice,
  onInstrument,
  onMode,
  onDifficulty,
  onOpenLibrary,
  onRemoveCustomSet,
}: InstrumentSelectorProps) {
  /* Eigenes Set aktiv (oder wird gerade aufgelöst) → die Preset-Kacheln
   * sind abgewählt und das Instrument spielt keine Rolle. */
  const customActive = customSet != null || customPending != null;
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
                aria-pressed={!customActive && difficulty === id}
                className={difficultyButtonClass(
                  !customActive && difficulty === id,
                )}
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
            <span>Weitere Modi (Altschlüssel, Tenorschlüssel, Hardcore)</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 transition-transform",
                extraOpen && "rotate-180",
              )}
              aria-hidden
            />
          </button>
          {!extraOpen &&
            !customActive &&
            isExtraSectionDifficulty(difficulty) && (
              <p className="text-dark dark:text-dark-text-muted border-dark-border/40 dark:border-dark-border/60 border-t px-3 py-2 text-center text-xs">
                Gewählt:{" "}
                <span className="text-dark dark:text-dark-text font-bold">
                  {DIFFICULTY_LABELS[difficulty].title}
                </span>
              </p>
            )}
          {extraOpen && (
            <div className="border-dark-border/40 dark:border-dark-border/60 space-y-2 border-t p-3">
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
                      aria-pressed={!customActive && difficulty === id}
                      className={difficultyButtonClass(
                        !customActive && difficulty === id,
                      )}
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

        {/* Eigenes Set aus der öffentlichen Bibliothek als „Custom“-Stufe. */}
        <div className="mt-4">
          <button
            type="button"
            onClick={onOpenLibrary}
            disabled={customPending != null}
            aria-pressed={customActive}
            className={cn(
              difficultyButtonClass(customActive),
              "block w-full disabled:opacity-60",
            )}
          >
            {customSet ? (
              <>
                <span className="text-dark dark:text-dark-text font-bold">
                  {customSet.name}
                </span>
                <p className="text-dark dark:text-dark-text-muted mt-1 text-xs leading-snug">
                  Eigenes Set ·{" "}
                  {customSet.noteCount === 1
                    ? "1 Note"
                    : `${customSet.noteCount} Noten`}
                </p>
              </>
            ) : customPending ? (
              <>
                <span className="text-dark dark:text-dark-text font-bold">
                  {customPending.name ?? "Eigenes Set"}
                </span>
                <p className="text-dark dark:text-dark-text-muted mt-1 text-xs leading-snug">
                  Lädt …
                </p>
              </>
            ) : (
              <>
                <span className="text-dark dark:text-dark-text font-bold">
                  Eigenes Set …
                </span>
                <p className="text-dark dark:text-dark-text-muted mt-1 text-xs leading-snug">
                  Notenset aus der öffentlichen Bibliothek wählen
                </p>
              </>
            )}
          </button>
          {customSet && (
            <div className="mt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={onOpenLibrary}
                className={SMALL_ACTION_BUTTON_CLASS}
              >
                Ändern
              </button>
              <button
                type="button"
                onClick={onRemoveCustomSet}
                className={SMALL_ACTION_BUTTON_CLASS}
              >
                Entfernen
              </button>
            </div>
          )}
          {customNotice && (
            <p className="mt-2 text-center text-xs font-bold text-amber-700 dark:text-amber-300">
              {customNotice}
            </p>
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
                aria-pressed={mode === id}
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

      {customActive ? (
        <div>
          <p className="text-dark dark:text-dark-text mb-2 text-center text-sm font-bold">
            Instrument
          </p>
          <p className="text-dark dark:text-dark-text-muted text-center text-xs leading-snug">
            Schlüssel und Töne kommen aus dem Set.
          </p>
        </div>
      ) : (
        !hideInstrument && (
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
                  aria-pressed={instrument === ins.id}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-sm border p-3 text-center transition-colors active:scale-[0.99] md:p-3.5",
                    instrument === ins.id
                      ? "border-primary bg-amber-50/90 dark:bg-amber-950/30"
                      : "border-dark-border/50 hover:border-primary/40 dark:border-dark-border dark:hover:border-primary/35 bg-transparent",
                  )}
                >
                  <span className="text-dark dark:text-dark-text leading-tight font-bold">
                    {ins.label}
                  </span>
                  <span className="text-dark dark:text-dark-text-muted text-[11px] leading-snug">
                    {ins.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
