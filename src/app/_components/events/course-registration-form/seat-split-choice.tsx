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
import { seatShortageCause, type ShortageCourse } from "./seat-shortage-notice";

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
  /**
   * Im öffentlichen Formular die Wahl zwischen ganzer Warteliste und
   * Aufteilen. Das Kursteam wählt das über den Status der Anmeldung.
   */
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
 * Reichen die freien Plätze nicht für alle, entscheiden die Anmeldenden:
 * alle gemeinsam auf die Warteliste, oder die freien Plätze jetzt nutzen —
 * und dann, wer sie bekommt. Sonst würde etwa eine Familie ungewollt getrennt.
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

  const problemText =
    problem === null
      ? null
      : problem.kind === "empty"
        ? "Bitte wählen Sie mindestens einen Teilnehmer für die freien Plätze."
        : problem.kind === "all"
          ? "Die Plätze reichen nicht für alle – mindestens ein Teilnehmer kommt auf die Warteliste."
          : seatShortageCause(course, problem, { waiting });

  const radioCard =
    "dark:bg-dark-background flex cursor-pointer items-start gap-3 rounded-lg border border-orange-200 bg-white p-3 dark:border-orange-800";

  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
      <p className="text-sm text-orange-800 dark:text-orange-300">
        <strong>Nicht genug freie Plätze:</strong>{" "}
        {seatShortageCause(course, shortage, { waiting })}
      </p>

      {showModeChoice && (
        <fieldset className="mt-3 space-y-2">
          <legend className="sr-only">
            Wie soll mit der Anmeldung verfahren werden?
          </legend>
          <label className={radioCard}>
            <input
              type="radio"
              name="seat-split-mode"
              checked={!splitting}
              onChange={() => onSplittingChange(false)}
              className="text-primary focus:ring-primary mt-0.5 h-4 w-4"
            />
            <span className="text-sm">
              <span className="text-dark dark:text-dark-text block font-semibold">
                Ganze Anmeldung auf die Warteliste
              </span>
              <span className="block text-gray-600 dark:text-gray-400">
                Alle {participants.length} Teilnehmer warten gemeinsam und
                werden bestätigt, sobald genug Plätze frei sind.
              </span>
            </span>
          </label>
          <label className={radioCard}>
            <input
              type="radio"
              name="seat-split-mode"
              checked={splitting}
              onChange={() => onSplittingChange(true)}
              className="text-primary focus:ring-primary mt-0.5 h-4 w-4"
            />
            <span className="text-sm">
              <span className="text-dark dark:text-dark-text block font-semibold">
                Freie Plätze jetzt nutzen
              </span>
              <span className="block text-gray-600 dark:text-gray-400">
                Die ausgewählten Teilnehmer sind sofort bestätigt, die übrigen
                kommen als eigene Anmeldung auf die Warteliste.
              </span>
            </span>
          </label>
        </fieldset>
      )}

      {splitting && (
        <div className="mt-4">
          <p className="text-dark dark:text-dark-text text-sm font-semibold">
            Wer bekommt die freien Plätze?
          </p>
          <ul className="mt-2 space-y-1">
            {participants.map((participant, index) => {
              const checked = selected.has(index);
              const disabled = !checked && wouldOverfill(index);
              const option = course.priceOptions.find(
                (po) => po.id === participant.priceOptionId,
              );
              return (
                <li key={index}>
                  <label
                    className={cn(
                      "flex items-start gap-3 rounded-md px-2 py-1.5",
                      disabled
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(index)}
                      className="text-primary focus:ring-primary mt-0.5 h-4 w-4"
                    />
                    <span className="text-sm">
                      <span className="text-dark dark:text-dark-text font-medium">
                        {participant.firstName} {participant.lastName}
                      </span>
                      {option && (
                        <span className="text-gray-600 dark:text-gray-400">
                          {" · "}
                          {priceOptionDisplayLabel(option, course.priceOptions)}
                        </span>
                      )}
                      <span className="block text-xs text-gray-600 dark:text-gray-400">
                        {checked ? "Bestätigt" : "Warteliste"}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          {problemText && (
            <p
              role="alert"
              className="mt-2 text-sm text-red-700 dark:text-red-400"
            >
              {problemText}
            </p>
          )}

          {splitsSiblingGroup(participants, selectedIndexes) && (
            <p className="mt-2 text-sm text-orange-800 dark:text-orange-300">
              Geschwister werden dabei getrennt. Ein beantragter
              Geschwisterkindrabatt bleibt für beide Teile erhalten.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
