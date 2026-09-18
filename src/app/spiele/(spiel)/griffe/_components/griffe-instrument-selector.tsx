"use client";

import { cn } from "@/lib/utils";
import { GAME_FOCUS_RING } from "../../../_lib/focus-ring";
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

/** Auswahlkarte: gewählt ist ein Druckfeld in Orange, sonst Haarlinie. */
function tileClass(active: boolean): string {
  return cn(
    "min-h-11 border p-[clamp(0.5rem,1.4dvh,1rem)] text-center transition-colors active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100",
    GAME_FOCUS_RING,
    active
      ? "on-orange border-primary bg-primary text-ink"
      : "border-rule text-ink hover:border-ink dark:border-night-rule dark:text-night-text dark:hover:border-night-text",
  );
}

/** Hinweiszeile unter dem Titel — auf Orange bleibt sie Tinte. */
function hintClass(active: boolean): string {
  return cn(
    "mt-1 text-xs leading-snug",
    active ? "text-ink/85" : "text-dark dark:text-night-muted",
  );
}

const GROUP_LABEL_CLASS =
  "text-ink dark:text-night-text mb-2 text-center text-sm font-bold";

/** Kleine Zweitaktion — steht innerhalb eines orangen Druckfelds. */
const SMALL_SECONDARY_CLASS =
  "border-ink text-ink hover:bg-ink hover:text-primary min-h-11 border px-3 text-xs font-bold transition-colors active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100";

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
    <div className="space-y-[clamp(1rem,3dvh,1.5rem)]">
      <div>
        <p className={GROUP_LABEL_CLASS}>Instrument</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {GRIFFE_INSTRUMENTS.map((ins) => {
            const active = instrument === ins.id;
            return (
              <button
                key={ins.id}
                type="button"
                onClick={() => onInstrument(ins.id)}
                aria-pressed={active}
                // Ohne eigenen Namen liest ein Vorleseprogramm Titel und
                // Beschreibung als ein Wort — der Hinweis ist deshalb stumm.
                aria-label={ins.label}
                className={tileClass(active)}
              >
                <span className="font-bold">{ins.label}</span>
                <span aria-hidden className={cn("block", hintClass(active))}>
                  {ins.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className={GROUP_LABEL_CLASS}>Schwierigkeit</p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-3">
          {(
            ["beginner", "intermediate", "advanced"] as GriffeDifficultyId[]
          ).map((id) => {
            const d = GRIFFE_DIFFICULTY_LABELS[id];
            const active = difficulty === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onDifficulty(id)}
                aria-pressed={active}
                aria-label={d.title}
                className={tileClass(active)}
              >
                <span className="font-bold">{d.title}</span>
                <span aria-hidden className={cn("block", hintClass(active))}>
                  {d.hint}
                </span>
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
                aria-label={`Eigenes Set: ${customSetName}`}
                className={cn(
                  "min-h-11 w-full active:scale-[0.99] motion-reduce:active:scale-100",
                  GAME_FOCUS_RING,
                )}
              >
                <span className="font-bold">{customSetName}</span>
                <span aria-hidden className={cn("block", hintClass(true))}>
                  {customSetSummary}
                </span>
              </button>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={onOpenLibrary}
                  aria-haspopup="dialog"
                  className={cn(SMALL_SECONDARY_CLASS, GAME_FOCUS_RING)}
                >
                  Ändern
                </button>
                <button
                  type="button"
                  onClick={onRemoveCustomSet}
                  className={cn(SMALL_SECONDARY_CLASS, GAME_FOCUS_RING)}
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
              aria-label="Eigenes Set wählen"
              className={cn(tileClass(false), "w-full")}
            >
              <span className="font-bold">Eigenes Set …</span>
              <span aria-hidden className={cn("block", hintClass(false))}>
                Notenset aus der öffentlichen Bibliothek wählen — gespielt
                werden alle Noten mit Griff für das gewählte Instrument
              </span>
            </button>
          )}
        </div>
      </div>

      <div>
        <p className={GROUP_LABEL_CLASS}>Modus</p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-3">
          {(["learn", "quiz", "endless"] as GameModeId[]).map((id) => {
            const m = GRIFFE_MODE_LABELS[id];
            const active = mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onMode(id)}
                aria-pressed={active}
                aria-label={m.title}
                className={tileClass(active)}
              >
                <span className="font-bold">{m.title}</span>
                <span aria-hidden className={cn("block", hintClass(active))}>
                  {m.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
