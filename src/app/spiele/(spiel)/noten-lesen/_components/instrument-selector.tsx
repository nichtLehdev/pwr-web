"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { GAME_FOCUS_RING } from "../../../_lib/focus-ring";
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

/**
 * Gewählt ist ein Druckfeld (Orange als Fläche, Tinte als Schrift) — in beiden
 * Drucken dieselbe Farbe, weil Tinte auf Orange rund 9:1 trägt.
 */
function choiceCardClass(active: boolean): string {
  return cn(
    "flex min-h-11 w-full flex-col justify-center border p-3 text-center transition-colors active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100 md:p-4",
    GAME_FOCUS_RING,
    active
      ? "on-orange bg-primary text-ink border-ink"
      : "border-rule text-ink hover:border-ink dark:border-night-rule dark:text-night-text dark:hover:border-night-text bg-transparent",
  );
}

const SMALL_ACTION_BUTTON_CLASS = cn(
  "border-rule text-ink hover:border-ink dark:border-night-rule dark:text-night-text dark:hover:border-night-text inline-flex min-h-11 items-center border px-4 text-xs font-bold transition-colors active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100",
  GAME_FOCUS_RING,
);

type ChoiceCardProps = {
  /** Sichtbarer Titel — zugleich der alleinige Vorlese-Name des Knopfes. */
  title: ReactNode;
  /** Sichtbarer Hinweis — per aria-describedby nachgereicht, nie Teil des Namens. */
  hint: ReactNode;
  /** Vorlese-Name; nötig, wenn `title` kein reiner String ist. */
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
};

/**
 * Auswahlkachel mit getrenntem Namen und Beschreibung.
 *
 * Vorher verschmolz ein Vorleseprogramm Titel und Hinweis zu einem einzigen
 * Namen („AnfängerErste Töne rund um B-Dur …“). Der Name ist jetzt der Titel
 * allein; der Hinweis hängt über `aria-describedby` daran und geht damit nicht
 * verloren. `<span class="block">` statt `<p>`, weil ein Absatz in einem
 * `<button>` kein gültiges Markup ist.
 */
function ChoiceCard({
  title,
  hint,
  label,
  active,
  disabled = false,
  onClick,
  className,
}: ChoiceCardProps) {
  const hintId = `${useId()}-hinweis`;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      aria-describedby={hintId}
      className={cn(choiceCardClass(active), className)}
    >
      <span className="block font-bold" aria-hidden>
        {title}
      </span>
      <span
        id={hintId}
        className={cn(
          "mt-1 block text-xs leading-snug",
          active ? "text-ink" : "text-dark dark:text-night-muted",
        )}
      >
        {hint}
      </span>
    </button>
  );
}

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
    <div className="flex flex-col gap-[clamp(0.875rem,2.4dvh,1.5rem)]">
      <div>
        <p className="text-ink dark:text-night-text mb-2 text-center text-sm font-bold">
          Schwierigkeit
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 md:gap-3">
          {DIFFICULTY_ORDER_PRIMARY.map((id) => {
            const d = DIFFICULTY_LABELS[id];
            return (
              <ChoiceCard
                key={id}
                title={d.title}
                label={d.title}
                hint={d.hint}
                active={!customActive && difficulty === id}
                onClick={() => {
                  onDifficulty(id);
                  setExtraOpen(false);
                }}
              />
            );
          })}
        </div>

        <div className="border-rule dark:border-night-rule mt-4 border">
          <button
            type="button"
            onClick={() => setExtraOpen((o) => !o)}
            aria-expanded={extraOpen}
            className={cn(
              "text-ink hover:bg-rule/25 dark:text-night-text dark:hover:bg-night-raised flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-bold transition-colors",
              GAME_FOCUS_RING,
            )}
          >
            <span>Weitere Modi (Altschlüssel, Tenorschlüssel, Hardcore)</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none",
                extraOpen && "rotate-180",
              )}
              aria-hidden
            />
          </button>
          {!extraOpen &&
            !customActive &&
            isExtraSectionDifficulty(difficulty) && (
              <p className="text-dark dark:text-night-muted border-rule dark:border-night-rule border-t px-3 py-2 text-center text-xs">
                Gewählt:{" "}
                <span className="text-ink dark:text-night-text font-bold">
                  {DIFFICULTY_LABELS[difficulty].title}
                </span>
              </p>
            )}
          {extraOpen && (
            <div className="border-rule dark:border-night-rule space-y-2 border-t p-3">
              <p className="text-dark dark:text-night-muted text-center text-[11px] leading-snug">
                Altschlüssel und Tenorschlüssel (Anfänger/Mittel) sowie Hardcore
                — ohne Instrumentwahl.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 md:gap-3">
                {DIFFICULTY_ORDER_EXTRA.map((id) => {
                  const d = DIFFICULTY_LABELS[id];
                  return (
                    <ChoiceCard
                      key={id}
                      title={d.title}
                      label={d.title}
                      hint={d.hint}
                      active={!customActive && difficulty === id}
                      onClick={() => {
                        onDifficulty(id);
                        setExtraOpen(true);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Eigenes Set aus der öffentlichen Bibliothek als „Custom“-Stufe. */}
        <div className="mt-4">
          <ChoiceCard
            title={
              customSet
                ? customSet.name
                : (customPending?.name ?? "Eigenes Set …")
            }
            label={
              customSet
                ? customSet.name
                : (customPending?.name ?? "Eigenes Set wählen")
            }
            hint={
              customSet
                ? `Eigenes Set · ${customSet.noteCount === 1 ? "1 Note" : `${customSet.noteCount} Noten`}`
                : customPending
                  ? "Lädt …"
                  : "Notenset aus der öffentlichen Bibliothek wählen"
            }
            active={customActive}
            disabled={customPending != null}
            onClick={onOpenLibrary}
            className="disabled:opacity-60"
          />
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
            <p className="text-primary-ink dark:text-primary mt-2 text-center text-xs font-bold">
              {customNotice}
            </p>
          )}
        </div>
      </div>

      <div>
        <p className="text-ink dark:text-night-text mb-2 text-center text-sm font-bold">
          Modus
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:gap-3">
          {(Object.keys(GAME_MODE_LABELS) as GameModeId[]).map((id) => {
            const m = GAME_MODE_LABELS[id];
            return (
              <ChoiceCard
                key={id}
                title={m.title}
                label={m.title}
                hint={m.hint}
                active={mode === id}
                onClick={() => onMode(id)}
              />
            );
          })}
        </div>
      </div>

      {customActive ? (
        <div>
          <p className="text-ink dark:text-night-text mb-2 text-center text-sm font-bold">
            Instrument
          </p>
          <p className="text-dark dark:text-night-muted text-center text-xs leading-snug">
            Schlüssel und Töne kommen aus dem Set.
          </p>
        </div>
      ) : (
        !hideInstrument && (
          <div>
            <p className="text-ink dark:text-night-text mb-2 text-center text-sm font-bold">
              Instrument
            </p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
              {INSTRUMENTS.map((ins) => (
                <ChoiceCard
                  key={ins.id}
                  title={ins.label}
                  label={ins.label}
                  hint={ins.description}
                  active={instrument === ins.id}
                  onClick={() => onInstrument(ins.id)}
                />
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
