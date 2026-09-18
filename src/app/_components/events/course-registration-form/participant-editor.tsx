"use client";

import { useEffect, useId, useRef } from "react";
import { Link as LinkIcon, Link2Off } from "lucide-react";
import type { CourseCustomFieldRule } from "@/lib/course-custom-fields";
import type { ParticipantFields } from "./types";
import { ParticipantCustomFields } from "./participant-custom-fields";
import {
  ParticipantPriceOptionField,
  type PriceOptionChoice,
} from "./participant-price-option-field";
import {
  FIELD_SELECT_SIZE,
  FIELD_SIZE_CLASS,
  fieldClass,
} from "./field-styles";

/** One of the other participants, as offered by the sibling linker. */
export interface SiblingCandidate {
  key: string;
  label: string;
  linked: boolean;
}

interface ParticipantEditorProps {
  priceOptions: PriceOptionChoice[];
  customFields: readonly CourseCustomFieldRule[];
  participant: ParticipantFields;
  onChange: (
    field: string,
    value: string | Date | Record<string, unknown>,
  ) => void;
  /** Field keys the validation pass flagged, e.g. `customField:Allergien`. */
  missingFields: string[];
  /** Human-readable problem for this participant, shown above the fields. */
  validationError?: string;
  /**
   * Whether to surface `validationError` and the red field borders at all.
   * False until the registrant asks to be done with this participant, so a
   * form they have not finished yet is not already telling them off.
   */
  showProblems: boolean;
  /** Availability rules — the edit page greys out sold-out categories. */
  priceOptionField?: {
    placeholderOption?: boolean;
    isOptionDisabled?: (optionId: string) => boolean;
    getOptionSuffix?: (optionId: string) => string;
    /** Stichtag der Altersgrenzen: der erste Kurstag. */
    ageReferenceDate?: Date | string | null;
    /** Nur das Kursteam darf eine Kategorie entgegen ihrer Grenze vergeben. */
    allowAgeMismatch?: boolean;
    /** Die schon gebuchte Kategorie bleibt wählbar, egal wie alt jemand ist. */
    ageExemptOptionId?: string | null;
  };
  /**
   * Zählt hoch, wenn „Fertig“ an fehlenden Angaben scheitert: dann springt
   * der Fokus ins erste markierte Feld, statt auf dem Knopf stehen zu bleiben.
   */
  focusProblemSignal?: number;
  /** Left out when the course has no sibling discount or nobody to link to. */
  siblings?: {
    candidates: SiblingCandidate[];
    onToggle: (key: string) => void;
    /** Names already in this participant's group, if any. */
    groupMembers: string[];
  };
}

/**
 * `!`-Wichtigkeit, weil dieselbe Klasse auch als `labelClassName` an
 * `ParticipantCustomFields` geht, das sie an das gerundete `ui/Label` reicht
 * — `cn` dort mergt nur und entfernt die eingebauten Klassen nicht.
 */
const LABEL_CLASS =
  "text-ink! dark:text-night-text! mb-1! block! text-sm! font-semibold!";

/** Sichtbares Sternchen; vorgelesen wird stattdessen „Pflichtfeld“. */
function RequiredMark() {
  return <span aria-hidden> *</span>;
}

/**
 * Every field of a single participant, in one column on phones and two from
 * `md:` up. Deliberately carries no card chrome of its own — it is rendered
 * inside `ParticipantSheet`, which supplies the frame.
 */
export function ParticipantEditor({
  priceOptions,
  customFields,
  participant,
  onChange,
  missingFields,
  validationError,
  showProblems,
  priceOptionField,
  focusProblemSignal = 0,
  siblings,
}: ParticipantEditorProps) {
  const uid = useId();
  const alertId = `${uid}-meldung`;
  const rootRef = useRef<HTMLDivElement>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);

  // The banner sits above fields that may be a scroll away, so a "Fertig" that
  // refuses to close would otherwise look like a dead button.
  useEffect(() => {
    if (showProblems && validationError) {
      alertRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [showProblems, validationError]);

  useEffect(() => {
    if (focusProblemSignal === 0) return;
    // Kästchengruppen sind als Ganzes markiert; angesprungen wird ihr erstes
    // Kästchen.
    rootRef.current
      ?.querySelector<HTMLElement>(
        '[aria-invalid="true"], [data-invalid] input',
      )
      ?.focus();
  }, [focusProblemSignal]);

  const flagged = (field: string) =>
    showProblems && missingFields.includes(field);

  /**
   * Beschriftung und Fehlerzustand eines Felds: Vorher hatten die Felder
   * weder `id` noch `htmlFor`, Vorname und Geburtsdatum blieben für
   * Vorlesegeräte ganz ohne Namen. Die Meldung oben beschreibt jedes
   * markierte Feld mit.
   */
  const fieldA11y = (key: string, invalid: boolean, required = true) => ({
    id: `${uid}-${key}`,
    required,
    "aria-required": required || undefined,
    "aria-invalid": invalid || undefined,
    "aria-describedby": invalid && validationError ? alertId : undefined,
  });

  const birthDateInvalid =
    flagged("birthDate") ||
    (showProblems &&
      !!validationError &&
      (validationError.includes("Geburtsdatum") ||
        validationError.includes("Jahr alt")));

  return (
    <div ref={rootRef} className="space-y-5">
      {showProblems && validationError ? (
        <p
          ref={alertRef}
          id={alertId}
          role="alert"
          className="border-2 border-red-700 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-400 dark:bg-red-900/20 dark:text-red-300"
        >
          {validationError}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-firstName`} className={LABEL_CLASS}>
            Vorname
            <RequiredMark />
          </label>
          <input
            {...fieldA11y("firstName", flagged("firstName"))}
            type="text"
            value={participant.firstName}
            onChange={(e) => onChange("firstName", e.target.value)}
            maxLength={100}
            className={fieldClass({
              error: flagged("firstName"),
            })}
          />
        </div>

        <div>
          <label htmlFor={`${uid}-lastName`} className={LABEL_CLASS}>
            Nachname
            <RequiredMark />
          </label>
          <input
            {...fieldA11y("lastName", flagged("lastName"))}
            type="text"
            value={participant.lastName}
            onChange={(e) => onChange("lastName", e.target.value)}
            maxLength={100}
            className={fieldClass({
              error: flagged("lastName"),
            })}
          />
        </div>

        <div>
          <label htmlFor={`${uid}-birthDate`} className={LABEL_CLASS}>
            Geburtsdatum
            <RequiredMark />
          </label>
          <input
            {...fieldA11y("birthDate", birthDateInvalid)}
            type="date"
            value={
              participant.birthDate
                ? new Date(participant.birthDate).toISOString().split("T")[0]
                : ""
            }
            // No validation here: the form re-checks every participant on each
            // change and owns `validationError`/`missingFields`, so a second
            // copy of the age rules would only drift out of step with it.
            onChange={(e) =>
              onChange(
                "birthDate",
                e.target.value ? new Date(e.target.value) : "",
              )
            }
            max={
              new Date(new Date().setFullYear(new Date().getFullYear() - 1))
                .toISOString()
                .split("T")[0]
            }
            className={fieldClass({
              error: birthDateInvalid,
            })}
          />
        </div>

        <div>
          <label htmlFor={`${uid}-city`} className={LABEL_CLASS}>
            Wohnort
            <RequiredMark />
          </label>
          <input
            {...fieldA11y("city", flagged("city"))}
            type="text"
            value={participant.city}
            onChange={(e) => onChange("city", e.target.value)}
            maxLength={100}
            className={fieldClass({
              error: flagged("city"),
            })}
            placeholder="Düsseldorf"
          />
        </div>

        <div>
          <label htmlFor={`${uid}-instrument`} className={LABEL_CLASS}>
            Instrument
          </label>
          <input
            id={`${uid}-instrument`}
            type="text"
            value={participant.instrument ?? ""}
            onChange={(e) => onChange("instrument", e.target.value)}
            maxLength={100}
            className={fieldClass({})}
            placeholder="Instrument"
          />
        </div>

        {priceOptions.length > 0 ? (
          <ParticipantPriceOptionField
            priceOptions={priceOptions}
            value={participant.priceOptionId ?? ""}
            onChange={(priceOptionId) =>
              onChange("priceOptionId", priceOptionId)
            }
            error={flagged("priceOptionId")}
            errorDescriptionId={
              flagged("priceOptionId") && validationError ? alertId : undefined
            }
            labelClassName={LABEL_CLASS}
            placeholderOption={priceOptionField?.placeholderOption}
            isOptionDisabled={priceOptionField?.isOptionDisabled}
            getOptionSuffix={priceOptionField?.getOptionSuffix}
            birthDate={participant.birthDate}
            ageReferenceDate={priceOptionField?.ageReferenceDate}
            allowAgeMismatch={priceOptionField?.allowAgeMismatch}
            ageExemptOptionId={priceOptionField?.ageExemptOptionId}
          />
        ) : null}

        <ParticipantCustomFields
          fields={customFields}
          customFields={participant.customFields}
          onChange={(next) => onChange("customFields", next)}
          invalidFieldNames={
            showProblems
              ? missingFields
                  .filter((m) => m.startsWith("customField:"))
                  .map((m) => m.slice("customField:".length))
              : []
          }
          errorDescriptionId={validationError ? alertId : undefined}
          labelClassName={LABEL_CLASS}
          inputClassName={FIELD_SIZE_CLASS}
          selectFieldSize={FIELD_SELECT_SIZE}
        />
      </div>

      {siblings && siblings.candidates.length > 0 ? (
        <div className="border-rule dark:border-night-rule space-y-2 border-t pt-5">
          {/* Überschrift einer Knopfgruppe, kein Feld — ein <label> ohne
              Bezug hätte nichts beschriftet. */}
          <p
            id={`${uid}-geschwister`}
            className="text-ink dark:text-night-text block text-sm font-semibold"
          >
            Geschwister verknüpfen
          </p>
          <div
            role="group"
            aria-labelledby={`${uid}-geschwister`}
            className="flex flex-wrap items-center gap-2"
          >
            {siblings.candidates.map((candidate) => (
              <button
                key={candidate.key}
                type="button"
                onClick={() => siblings.onToggle(candidate.key)}
                className={`inline-flex min-h-11 items-center gap-2 border-2 px-3 text-sm transition-colors ${
                  candidate.linked
                    ? "border-ink bg-ink text-paper dark:border-night-text dark:bg-night-text dark:text-night"
                    : "border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night"
                }`}
              >
                {candidate.linked ? (
                  <Link2Off className="h-4 w-4 shrink-0" aria-hidden />
                ) : (
                  <LinkIcon className="h-4 w-4 shrink-0" aria-hidden />
                )}
                <span>
                  {candidate.label}
                  {candidate.linked && " ✓"}
                </span>
              </button>
            ))}
          </div>
          {siblings.groupMembers.length > 0 ? (
            <p className="text-dark dark:text-night-muted text-xs">
              Geschwistergruppe: {siblings.groupMembers.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
