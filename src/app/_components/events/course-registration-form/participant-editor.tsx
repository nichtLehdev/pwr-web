"use client";

import { useEffect, useRef } from "react";
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
  };
  /** Left out when the course has no sibling discount or nobody to link to. */
  siblings?: {
    candidates: SiblingCandidate[];
    onToggle: (key: string) => void;
    /** Names already in this participant's group, if any. */
    groupMembers: string[];
  };
}

const LABEL_CLASS =
  "mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300";

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
  siblings,
}: ParticipantEditorProps) {
  const alertRef = useRef<HTMLParagraphElement>(null);

  // The banner sits above fields that may be a scroll away, so a "Fertig" that
  // refuses to close would otherwise look like a dead button.
  useEffect(() => {
    if (showProblems && validationError) {
      alertRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [showProblems, validationError]);

  const flagged = (field: string) =>
    showProblems && missingFields.includes(field);

  const birthDateInvalid =
    flagged("birthDate") ||
    (showProblems &&
      !!validationError &&
      (validationError.includes("Geburtsdatum") ||
        validationError.includes("Jahr alt")));

  return (
    <div className="space-y-5">
      {showProblems && validationError ? (
        <p
          ref={alertRef}
          role="alert"
          className="rounded-lg border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-400 dark:bg-red-900/20 dark:text-red-300"
        >
          {validationError}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
        <div>
          <label className={LABEL_CLASS}>Vorname *</label>
          <input
            type="text"
            value={participant.firstName}
            onChange={(e) => onChange("firstName", e.target.value)}
            maxLength={100}
            required
            className={fieldClass({
              error: flagged("firstName"),
              className: "dark:bg-dark-background bg-white",
            })}
          />
        </div>

        <div>
          <label className={LABEL_CLASS}>Nachname *</label>
          <input
            type="text"
            value={participant.lastName}
            onChange={(e) => onChange("lastName", e.target.value)}
            maxLength={100}
            required
            className={fieldClass({
              error: flagged("lastName"),
              className: "dark:bg-dark-background bg-white",
            })}
          />
        </div>

        <div>
          <label className={LABEL_CLASS}>Geburtsdatum *</label>
          <input
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
            required
            className={fieldClass({
              error: birthDateInvalid,
              className: "dark:bg-dark-background bg-white",
            })}
          />
        </div>

        <div>
          <label className={LABEL_CLASS}>Wohnort *</label>
          <input
            type="text"
            value={participant.city}
            onChange={(e) => onChange("city", e.target.value)}
            maxLength={100}
            required
            className={fieldClass({
              error: flagged("city"),
              className: "dark:bg-dark-background bg-white",
            })}
            placeholder="Düsseldorf"
          />
        </div>

        <div>
          <label className={LABEL_CLASS}>Instrument</label>
          <input
            type="text"
            value={participant.instrument ?? ""}
            onChange={(e) => onChange("instrument", e.target.value)}
            maxLength={100}
            className={fieldClass({
              className: "dark:bg-dark-background bg-white",
            })}
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
            labelClassName={LABEL_CLASS}
            placeholderOption={priceOptionField?.placeholderOption}
            isOptionDisabled={priceOptionField?.isOptionDisabled}
            getOptionSuffix={priceOptionField?.getOptionSuffix}
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
          labelClassName={LABEL_CLASS}
          inputClassName={FIELD_SIZE_CLASS}
          selectFieldSize={FIELD_SELECT_SIZE}
        />
      </div>

      {siblings && siblings.candidates.length > 0 ? (
        <div className="dark:border-dark-border space-y-2 border-t border-gray-100 pt-5">
          <label className="text-dark dark:text-dark-text block text-sm font-semibold">
            Geschwister verknüpfen
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {siblings.candidates.map((candidate) => (
              <button
                key={candidate.key}
                type="button"
                onClick={() => siblings.onToggle(candidate.key)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm transition-colors ${
                  candidate.linked
                    ? "border-green-500 bg-green-50 text-green-700 dark:border-green-600 dark:bg-green-900/30 dark:text-green-400"
                    : "dark:border-dark-border dark:bg-dark-background dark:hover:bg-dark-background-secondary border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:text-gray-300"
                }`}
              >
                {candidate.linked ? (
                  <Link2Off className="h-4 w-4 shrink-0" />
                ) : (
                  <LinkIcon className="h-4 w-4 shrink-0" />
                )}
                <span>
                  {candidate.label}
                  {candidate.linked && " ✓"}
                </span>
              </button>
            ))}
          </div>
          {siblings.groupMembers.length > 0 ? (
            <p className="text-xs text-green-700 dark:text-green-400">
              Geschwistergruppe: {siblings.groupMembers.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
