"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import {
  isRequiredCustomFieldEmpty,
  type CourseCustomFieldRule,
} from "@/lib/course-custom-fields";
import type { ParticipantFields } from "./types";
import { ParticipantEditor } from "./participant-editor";
import { ParticipantSheet } from "./participant-sheet";
import type { PriceOptionChoice } from "./participant-price-option-field";

interface ParticipantFormPreviewProps {
  /** Ungespeicherter Stand aus dem Kursformular; Zeilen ohne Namen fallen weg. */
  customFields: readonly CourseCustomFieldRule[];
  instrumentRequired: boolean;
  priceOptions: PriceOptionChoice[];
  /** Erster Kurstag, Stichtag der Altersgrenzen. */
  startDate?: string | null;
}

const EMPTY_PARTICIPANT: ParticipantFields = {
  firstName: "",
  lastName: "",
  birthDate: null,
  city: "",
  instrument: "",
  priceOptionId: null,
  customFields: {},
  notes: "",
};

/**
 * Knopf im Kursformular, der das Teilnehmerfenster aus Schritt 2 der Anmeldung
 * mit dem aktuellen, noch ungespeicherten Stand zeigt. Nichts wird gespeichert.
 */
export function ParticipantFormPreview({
  customFields,
  instrumentRequired,
  priceOptions,
  startDate,
}: ParticipantFormPreviewProps) {
  const [open, setOpen] = useState(false);
  const [participant, setParticipant] =
    useState<ParticipantFields>(EMPTY_PARTICIPANT);
  const [doneAttempted, setDoneAttempted] = useState(false);
  const [doneFailures, setDoneFailures] = useState(0);

  const fields = customFields.filter((field) => field.fieldName.trim());
  const choices = priceOptions.filter((option) => option.label.trim());

  const missingFields = (() => {
    const missing: string[] = [];
    if (!participant.firstName.trim()) missing.push("firstName");
    if (!participant.lastName.trim()) missing.push("lastName");
    if (!participant.birthDate) missing.push("birthDate");
    if (!participant.city.trim()) missing.push("city");
    if (instrumentRequired && !participant.instrument?.trim()) {
      missing.push("instrument");
    }
    if (choices.length > 0 && !participant.priceOptionId) {
      missing.push("priceOptionId");
    }
    const values = (participant.customFields ?? {}) as Record<string, unknown>;
    for (const field of fields) {
      if (
        field.isRequired &&
        isRequiredCustomFieldEmpty(field.fieldType, values[field.fieldName])
      ) {
        missing.push(`customField:${field.fieldName}`);
      }
    }
    return missing;
  })();

  const close = () => {
    setOpen(false);
    setParticipant(EMPTY_PARTICIPANT);
    setDoneAttempted(false);
    setDoneFailures(0);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night inline-flex min-h-11 items-center gap-2 border-2 px-3 text-sm font-semibold transition-colors"
      >
        <Eye className="h-4 w-4 shrink-0" aria-hidden />
        Vorschau Teilnehmerangaben
      </button>

      {open ? (
        <ParticipantSheet
          title="Vorschau: Teilnehmer 1"
          subtitle="So sehen Anmeldende die Angaben je Teilnehmer. Nichts wird gespeichert."
          onClose={close}
          onDone={() => {
            setDoneAttempted(true);
            if (missingFields.length > 0) {
              setDoneFailures((n) => n + 1);
              return;
            }
            close();
          }}
        >
          <ParticipantEditor
            priceOptions={choices}
            customFields={fields}
            instrumentRequired={instrumentRequired}
            participant={participant}
            onChange={(field, value) =>
              setParticipant((current) => ({ ...current, [field]: value }))
            }
            missingFields={missingFields}
            validationError={
              missingFields.length > 0
                ? "Bitte alle Pflichtfelder ausfüllen."
                : undefined
            }
            showProblems={doneAttempted}
            focusProblemSignal={doneFailures}
            priceOptionField={{
              placeholderOption: true,
              ageReferenceDate: startDate || null,
            }}
          />
        </ParticipantSheet>
      ) : null}
    </>
  );
}
