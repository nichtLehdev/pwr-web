"use client";

import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
} from "@/app/_components/ui/scrollable-modal";
import { Heading } from "@/app/_components/programmheft/section-head";

export interface CourseExistingRegistrationOptionsProps {
  onEditExisting: () => void;
  onCreateAdditional: () => void;
  onCancel: () => void;
  participantCount: number;
}

export function CourseExistingRegistrationOptions({
  onEditExisting,
  onCreateAdditional,
  onCancel,
  participantCount,
}: CourseExistingRegistrationOptionsProps) {
  return (
    <ScrollableModal onBackdropClick={onCancel}>
      <ScrollableModalCard
        maxW="md"
        className="border-ink dark:border-night-text rounded-none! border-2 shadow-none!"
      >
        <ScrollableModalBody>
          <Heading as="h2" size="list">
            Bestehende Anmeldung gefunden
          </Heading>
          <p className="text-ink dark:text-night-text mt-4">
            Sie haben bereits eine aktive Anmeldung für diesen Kurs mit{" "}
            <strong>
              {participantCount}{" "}
              {participantCount === 1 ? "Teilnehmer" : "Teilnehmern"}
            </strong>
            . Möchten Sie Ihre bestehende Anmeldung bearbeiten oder eine
            zusätzliche Anmeldung erstellen?
          </p>
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={onEditExisting}
              className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-primary dark:text-ink dark:hover:bg-paper semi-condensed inline-flex min-h-12 w-full items-center justify-center px-6 text-lg font-semibold transition-colors"
            >
              Bestehende Anmeldung bearbeiten
            </button>
            <button
              type="button"
              onClick={onCreateAdditional}
              className="border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night semi-condensed inline-flex min-h-12 w-full items-center justify-center border-2 px-6 text-lg font-semibold transition-colors"
            >
              Zusätzliche Anmeldung erstellen
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="text-dark hover:text-ink dark:text-night-muted dark:hover:text-night-text semi-condensed inline-flex min-h-12 w-full items-center justify-center px-6 text-base font-semibold transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </ScrollableModalBody>
      </ScrollableModalCard>
    </ScrollableModal>
  );
}
