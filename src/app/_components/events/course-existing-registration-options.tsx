"use client";

import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
} from "@/app/_components/ui/scrollable-modal";

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
      <ScrollableModalCard maxW="md">
        <ScrollableModalBody>
          <h2 className="text-dark dark:text-dark-text mb-4 text-xl font-bold">
            Bestehende Anmeldung gefunden
          </h2>
          <p className="mb-6 text-gray-700 dark:text-gray-300">
            Sie haben bereits eine aktive Anmeldung für diesen Kurs mit{" "}
            <strong>
              {participantCount}{" "}
              {participantCount === 1 ? "Teilnehmer" : "Teilnehmern"}
            </strong>
            . Möchten Sie Ihre bestehende Anmeldung bearbeiten oder eine
            zusätzliche Anmeldung erstellen?
          </p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={onEditExisting}
              className="bg-primary hover:bg-primary-dark w-full rounded-lg px-6 py-3 font-semibold text-white transition-colors"
            >
              Bestehende Anmeldung bearbeiten
            </button>
            <button
              type="button"
              onClick={onCreateAdditional}
              className="dark:border-dark-border dark:hover:bg-dark-surface w-full rounded-lg border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300"
            >
              Zusätzliche Anmeldung erstellen
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-lg px-6 py-3 font-semibold text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Abbrechen
            </button>
          </div>
        </ScrollableModalBody>
      </ScrollableModalCard>
    </ScrollableModal>
  );
}
