"use client";

import { cn } from "@/lib/utils";
import { priceOptionDisplayLabel } from "@/lib/course-price-options";
import {
  registrationSeatShortage,
  type SeatShortage,
} from "@/lib/registration-seat-shortage";
import {
  splitsSiblingGroup,
  type SeatAvailability,
  type SeatSelectionProblem,
} from "@/lib/registration-split";
import { Note } from "@/app/_components/programmheft/note";
import { Tag } from "@/app/_components/programmheft/tag";
import { seatShortageCause, type ShortageCourse } from "./seat-shortage-notice";
import { RADIO_INPUT_CLASS } from "@/app/_components/programmheft/field";

/** Wie das Kontrollkästchen in `programmheft/field`: eckig, angehakt Tinte. */
const CHECKBOX_CLASS =
  "border-ink checked:bg-ink dark:border-night-text dark:checked:bg-night-text bg-paper dark:bg-night mt-0.5 h-5 w-5 shrink-0 cursor-[inherit] appearance-none border-2";

/** Gemeinsame Einzelwahl (siehe `RADIO_INPUT_CLASS`), hier oben ausgerichtet. */
const RADIO_CLASS = `${RADIO_INPUT_CLASS} mt-0.5`;

/** Das Polster gleicht den dickeren Rahmen im gewählten Zustand aus, damit nichts springt. */
function choiceCard(checked: boolean): string {
  return cn(
    "flex min-h-11 cursor-pointer items-start gap-3",
    checked
      ? "border-ink dark:border-night-text border-2 p-[15px]"
      : "border-rule dark:border-night-rule hover:border-ink dark:hover:border-night-text border p-4",
  );
}

/** Was die Auswahl von einem Teilnehmer braucht — im Formular wie gespeichert. */
export type SplitChoiceParticipant = {
  firstName: string;
  lastName: string;
  priceOptionId?: string | null;
  siblingGroupId?: string | null;
};

interface SeatSplitChoiceProps {
  course: ShortageCourse;
  participants: SplitChoiceParticipant[];
  shortage: SeatShortage;
  availability: SeatAvailability;
  /** Wahl ganze Warteliste vs. Aufteilen; das Kursteam wählt das über den Status. */
  showModeChoice: boolean;
  /** Die Anmeldung steht schon auf der Warteliste (Nachrück-Angebot). */
  waiting?: boolean;
  splitting: boolean;
  onSplittingChange: (splitting: boolean) => void;
  selectedIndexes: number[];
  onSelectedIndexesChange: (indexes: number[]) => void;
  problem: SeatSelectionProblem | null;
}

/**
 * Reichen die Plätze nicht, entscheiden die Anmeldenden: alle auf die Warteliste oder
 * aufteilen und wer die Plätze bekommt — sonst würde etwa eine Familie ungewollt getrennt.
 */
export function SeatSplitChoice({
  course,
  participants,
  shortage,
  availability,
  showModeChoice,
  waiting = false,
  splitting,
  onSplittingChange,
  selectedIndexes,
  onSelectedIndexesChange,
  problem,
}: SeatSplitChoiceProps) {
  const priceOptionIds = participants.map((p) => p.priceOptionId);
  const selected = new Set(selectedIndexes);

  const toggle = (index: number) => {
    onSelectedIndexesChange(
      selected.has(index)
        ? selectedIndexes.filter((i) => i !== index)
        : [...selectedIndexes, index].sort((a, b) => a - b),
    );
  };

  const wouldOverfill = (index: number) =>
    registrationSeatShortage({
      participantPriceOptionIds: [...selectedIndexes, index].map(
        (i) => priceOptionIds[i],
      ),
      ...availability,
    }) !== null;

  /** Der erste Teilnehmer, der sich noch auswählen lässt. */
  const firstChoosable = participants.findIndex(
    (_, index) => selected.has(index) || !wouldOverfill(index),
  );

  const problemText =
    problem === null
      ? null
      : problem.kind === "empty"
        ? "Bitte wählen Sie mindestens einen Teilnehmer für die freien Plätze."
        : problem.kind === "all"
          ? "Die Plätze reichen nicht für alle – mindestens ein Teilnehmer kommt auf die Warteliste."
          : seatShortageCause(course, problem, { waiting });

  return (
    <div className="space-y-6">
      {waiting ? (
        // Im Nachrück-Angebot steht die Frist schon auf der orangen Fläche
        // darüber; eine zweite direkt darunter würde sie übertönen.
        <p className="text-ink dark:text-night-text">
          <strong>Nicht genug freie Plätze:</strong>{" "}
          {seatShortageCause(course, shortage, { waiting })}
        </p>
      ) : (
        <Note tone="important">
          <p>
            <strong>Nicht genug freie Plätze:</strong>{" "}
            {seatShortageCause(course, shortage, { waiting })}
          </p>
        </Note>
      )}

      {showModeChoice && (
        <fieldset className="space-y-3">
          <legend className="sr-only">
            Wie soll mit der Anmeldung verfahren werden?
          </legend>
          <label className={choiceCard(!splitting)}>
            <input
              type="radio"
              name="seat-split-mode"
              checked={!splitting}
              onChange={() => onSplittingChange(false)}
              className={RADIO_CLASS}
            />
            <span>
              <span className="text-ink dark:text-night-text block font-semibold">
                Ganze Anmeldung auf die Warteliste
              </span>
              <span className="text-dark dark:text-night-muted mt-1 block text-sm">
                Alle {participants.length} Teilnehmer warten gemeinsam und
                werden bestätigt, wenn genug Plätze frei sind und das Kursteam
                die Warteliste nachrücken lässt.
              </span>
            </span>
          </label>
          <label className={choiceCard(splitting)}>
            <input
              type="radio"
              name="seat-split-mode"
              checked={splitting}
              onChange={() => onSplittingChange(true)}
              className={RADIO_CLASS}
            />
            <span>
              <span className="text-ink dark:text-night-text block font-semibold">
                Freie Plätze jetzt nutzen
              </span>
              <span className="text-dark dark:text-night-muted mt-1 block text-sm">
                Die ausgewählten Teilnehmer sind sofort bestätigt, die übrigen
                kommen als eigene Anmeldung auf die Warteliste.
              </span>
            </span>
          </label>
        </fieldset>
      )}

      {splitting && (
        <fieldset>
          <legend className="text-ink dark:text-night-text text-sm font-semibold">
            Wer bekommt die freien Plätze?
          </legend>
          <ul className="border-rule dark:border-night-rule mt-2 border-t">
            {participants.map((participant, index) => {
              const checked = selected.has(index);
              const disabled = !checked && wouldOverfill(index);
              const option = course.priceOptions.find(
                (po) => po.id === participant.priceOptionId,
              );
              return (
                <li
                  key={index}
                  className="border-rule dark:border-night-rule border-b"
                >
                  <label
                    className={cn(
                      "flex min-h-11 items-start gap-3 py-3",
                      disabled
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer",
                    )}
                  >
                    <input
                      type="checkbox"
                      // Sprungziel, wenn die Auswahl vor dem Absenden fehlt.
                      data-focus-key={
                        index === firstChoosable ? "seatSelection" : undefined
                      }
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(index)}
                      className={CHECKBOX_CLASS}
                    />
                    {/* Kategorie in eigener Zeile, sonst bricht auf dem Handy der Trennpunkt um. */}
                    <span className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-4 gap-y-2">
                      <span className="min-w-0">
                        <span className="text-ink dark:text-night-text block font-semibold">
                          {participant.firstName} {participant.lastName}
                        </span>
                        {option && (
                          <span className="text-dark dark:text-night-muted block text-sm">
                            {priceOptionDisplayLabel(
                              option,
                              course.priceOptions,
                            )}
                          </span>
                        )}
                      </span>
                      {/* Dieselben Töne wie der Status auf der Anmeldungsseite. */}
                      <Tag tone={checked ? "inverse" : "orange"}>
                        {checked ? "Bestätigt" : "Warteliste"}
                      </Tag>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          {problemText && (
            <p
              role="alert"
              className="mt-3 text-sm font-semibold text-red-700 dark:text-red-400"
            >
              {problemText}
            </p>
          )}

          {splitsSiblingGroup(participants, selectedIndexes) && (
            <p className="text-primary-ink dark:text-primary mt-3 text-sm font-semibold">
              Geschwister werden dabei getrennt. Ein beantragter
              Geschwisterkindrabatt bleibt für beide Teile erhalten.
            </p>
          )}
        </fieldset>
      )}
    </div>
  );
}
