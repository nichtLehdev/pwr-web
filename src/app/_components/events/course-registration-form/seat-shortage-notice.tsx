"use client";

import { priceOptionDisplayLabel } from "@/lib/course-price-options";
import type { SeatShortage } from "@/lib/registration-seat-shortage";
import { Note } from "@/app/_components/programmheft/note";
import type { CourseWithRelations } from "./types";

function seats(count: number): string {
  return count === 1 ? "ist nur noch 1 Platz" : `sind nur noch ${count} Plätze`;
}

/** Was die Hinweise vom Kurs brauchen — im Formular wie an einer Anmeldung. */
export type ShortageCourse = {
  priceOptions: ReadonlyArray<{
    id: string;
    label: string;
    description: string | null;
  }>;
};

/**
 * Ein Satz dazu, woran es fehlt: am Kurs oder an einer Preiskategorie.
 * `waiting`: für eine Anmeldung, die schon auf der Warteliste steht — nicht
 * für eine, die gerade ausgefüllt wird.
 */
export function seatShortageCause(
  course: ShortageCourse,
  shortage: SeatShortage,
  { waiting = false }: { waiting?: boolean } = {},
): string {
  const tail = (inOption: boolean) =>
    waiting
      ? ` – nicht genug für alle ${shortage.requested} Teilnehmer${inOption ? " dieser Kategorie" : ""}.`
      : `, Sie melden ${shortage.requested} Teilnehmer${inOption ? " darin" : ""} an.`;

  if (shortage.kind === "course") {
    return shortage.free === 0
      ? "Der Kurs ist bereits ausgebucht."
      : `Im Kurs ${seats(shortage.free)} frei${tail(false)}`;
  }

  const option = course.priceOptions.find(
    (po) => po.id === shortage.priceOptionId,
  );
  const label = option
    ? `„${priceOptionDisplayLabel(option, course.priceOptions)}“`
    : "";
  return shortage.free === 0
    ? `Die Preiskategorie ${label} ist bereits ausgebucht.`
    : `In der Preiskategorie ${label} ${seats(shortage.free)} frei, Sie melden ${shortage.requested} Teilnehmer darin an.`;
}

/**
 * Hinweis im letzten Schritt, wenn die Plätze für die eingetragenen
 * Teilnehmer nicht reichen und sich die Anmeldung nicht aufteilen lässt: mit
 * Warteliste landet die ganze Anmeldung dort, ohne wird sie abgelehnt.
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
  const cause = seatShortageCause(course, shortage);

  // Ohne Warteliste lässt sich so nicht absenden: ein Fehler, der vorliest
  // (`Note` setzt `role="alert"`). Mit Warteliste ist es eine Folge, die man
  // vor dem Absenden kennen muss — die orange Fläche.
  if (!course.allowWaitingList) {
    return (
      <Note tone="error">
        <p>
          <strong>Nicht genug freie Plätze:</strong> {cause}{" "}
          {shortage.kind === "course"
            ? "Bitte reduzieren Sie die Anzahl der Teilnehmer."
            : "Bitte wählen Sie eine andere Preiskategorie oder reduzieren Sie die Anzahl der Teilnehmer."}
        </p>
      </Note>
    );
  }

  return (
    <Note tone="important">
      <p>
        <strong>Hinweis:</strong> {cause}{" "}
        {participantCount > 1
          ? `Alle ${participantCount} Teilnehmer kommen auf die Warteliste und werden gemeinsam bestätigt, sobald genug Plätze frei sind.`
          : "Sie werden auf die Warteliste gesetzt und bei einem freigewordenen Platz benachrichtigt."}
      </p>
    </Note>
  );
}
