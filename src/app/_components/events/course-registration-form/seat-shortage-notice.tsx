"use client";

import { priceOptionDisplayLabel } from "@/lib/course-price-options";
import type { SeatShortage } from "@/lib/registration-seat-shortage";
import type { CourseWithRelations } from "./types";

function seats(count: number): string {
  return count === 1 ? "ist nur noch 1 Platz" : `sind nur noch ${count} Plätze`;
}

/**
 * Hinweis im letzten Schritt, wenn die Plätze für die eingetragenen
 * Teilnehmer nicht reichen: mit Warteliste landet die **ganze** Anmeldung
 * dort, ohne wird sie abgelehnt. Aufgeteilt wird eine Anmeldung nicht.
 */
export function SeatShortageNotice({
  course,
  shortage,
  participantCount,
}: {
  course: CourseWithRelations;
  shortage: SeatShortage;
  participantCount: number;
}) {
  const option =
    shortage.kind === "priceOption"
      ? course.priceOptions.find((po) => po.id === shortage.priceOptionId)
      : undefined;
  const optionLabel = option
    ? `„${priceOptionDisplayLabel(option, course.priceOptions)}“`
    : "";

  const cause =
    shortage.kind === "course"
      ? shortage.free === 0
        ? "Der Kurs ist bereits ausgebucht."
        : `Im Kurs ${seats(shortage.free)} frei, Sie melden ${shortage.requested} Teilnehmer an.`
      : shortage.free === 0
        ? `Die Preiskategorie ${optionLabel} ist bereits ausgebucht.`
        : `In der Preiskategorie ${optionLabel} ${seats(shortage.free)} frei, Sie melden ${shortage.requested} Teilnehmer darin an.`;

  if (!course.allowWaitingList) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
      >
        <p className="text-sm text-red-800 dark:text-red-300">
          <strong>Nicht genug freie Plätze:</strong> {cause}{" "}
          {shortage.kind === "course"
            ? "Bitte reduzieren Sie die Anzahl der Teilnehmer."
            : "Bitte wählen Sie eine andere Preiskategorie oder reduzieren Sie die Anzahl der Teilnehmer."}
        </p>
      </div>
    );
  }

  const partlyFree = shortage.free > 0;

  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
      <p className="text-sm text-orange-800 dark:text-orange-300">
        <strong>Hinweis:</strong> {cause}{" "}
        {participantCount > 1
          ? `Ihre Anmeldung wird nicht aufgeteilt: alle ${participantCount} Teilnehmer kommen auf die Warteliste und werden gemeinsam bestätigt, sobald genug Plätze frei sind.`
          : "Sie werden auf die Warteliste gesetzt und bei einem freigewordenen Platz benachrichtigt."}
        {partlyFree && participantCount > 1
          ? ` Sollen die freien Plätze sofort genutzt werden, melden Sie hier nur so viele Teilnehmer an und die übrigen in einer zweiten Anmeldung.`
          : ""}
      </p>
    </div>
  );
}
