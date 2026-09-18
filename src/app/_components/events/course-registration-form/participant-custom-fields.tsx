"use client";

import { useId } from "react";
import { Input, Label, Textarea, Select } from "@/app/_components/ui";
import type { SelectProps } from "@/app/_components/ui/select";
import {
  parseSelectOptionValues,
  YEAR_MAX,
  YEAR_MIN,
  type CourseCustomFieldRule,
} from "@/lib/course-custom-fields";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/app/_components/programmheft/field";

/** Überschreibt die `ui/`-Inputs per `!`, weil `cn` widersprüchliche Utilities nicht entfernt. */
const CUSTOM_FIELD_INPUT_CLASS =
  "rounded-none! border-2! border-rule dark:border-night-rule bg-paper! dark:bg-night! text-ink! dark:text-night-text! shadow-none! focus:border-ink! dark:focus:border-night-text! focus:ring-0!";
const CUSTOM_FIELD_LABEL_CLASS =
  "text-ink! dark:text-night-text! mb-1! block! text-sm! font-semibold!";

function asCustomFieldsRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function getCustomFieldValue(
  customFields: unknown,
  fieldName: string,
): unknown {
  const record = asCustomFieldsRecord(customFields);
  return fieldName in record ? record[fieldName] : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v));
}

/** Native input type for the text-like custom field types. */
function inputTypeFor(fieldType: string): string {
  switch (fieldType) {
    case "NUMBER":
      return "number";
    case "DATE":
      return "date";
    case "TIME":
      return "time";
    case "YEAR":
      return "number";
    case "PHONE":
      return "tel";
    case "EMAIL":
      return "email";
    default:
      return "text";
  }
}

type ParticipantCustomFieldsProps = {
  fields: readonly CourseCustomFieldRule[];
  customFields: unknown;
  onChange: (next: Record<string, unknown>) => void;
  invalidFieldNames?: string[];
  labelClassName?: string;
  inputClassName?: string;
  /** Keeps the select the same height as `inputClassName`'s text inputs. */
  selectFieldSize?: SelectProps["fieldSize"];
  /** Background/border wrapper for CHECKBOX and MULTISELECT boxes (step 2 tints sibling groups green). */
  choiceContainerClassName?: string;
  /** Sammelmeldung außerhalb der Felder, per `aria-describedby` verknüpft. */
  errorDescriptionId?: string;
};

export function ParticipantCustomFields({
  fields,
  customFields,
  onChange,
  invalidFieldNames = [],
  labelClassName = CUSTOM_FIELD_LABEL_CLASS,
  inputClassName = CUSTOM_FIELD_INPUT_CLASS,
  selectFieldSize,
  choiceContainerClassName = "bg-paper dark:bg-night",
  errorDescriptionId,
}: ParticipantCustomFieldsProps) {
  const uid = useId();
  if (fields.length === 0) {
    return null;
  }

  const values = asCustomFieldsRecord(customFields);

  const setField = (fieldName: string, value: unknown) => {
    onChange({ ...values, [fieldName]: value });
  };

  return (
    <>
      {fields.map((field, index) => {
        const isInvalid = invalidFieldNames.includes(field.fieldName);
        const fieldValue = getCustomFieldValue(customFields, field.fieldName);
        const optionValues = parseSelectOptionValues(field.options);
        // Nach Position statt Feldname: Namen dürfen Leerzeichen enthalten.
        const controlId = `${uid}-${index}`;
        const labelId = `${controlId}-label`;
        const helpId = `${controlId}-hilfe`;
        const showsHelp = !!field.helpText && field.fieldType !== "CHECKBOX";
        // Beschriftung und Fehlerzustand für das einzelne Feld; Kästchen-
        // gruppen tragen sie als Gruppe (siehe unten).
        const describedBy =
          [showsHelp ? helpId : null, isInvalid ? errorDescriptionId : null]
            .filter(Boolean)
            .join(" ") || undefined;
        const controlA11y = {
          id: controlId,
          required: field.isRequired,
          "aria-invalid": isInvalid || undefined,
          "aria-describedby": describedBy,
        };
        const isGroup =
          field.fieldType === "CHECKBOX" ||
          (field.fieldType === "MULTISELECT" && optionValues.length > 0);

        return (
          <div key={field.fieldName} className="md:col-span-2">
            {/* Eigenes stummes Sternchen: `Label` sagt sonst englisch „required“ an. */}
            <Label
              id={labelId}
              htmlFor={isGroup ? undefined : controlId}
              className={labelClassName}
            >
              {field.fieldName}
              {field.isRequired ? (
                <span
                  aria-hidden
                  className="ml-1 text-red-600 dark:text-red-400"
                >
                  *
                </span>
              ) : null}
            </Label>
            {field.fieldType === "SELECT" && optionValues.length > 0 ? (
              <Select
                {...controlA11y}
                value={fieldValue != null ? String(fieldValue) : ""}
                onChange={(e) => setField(field.fieldName, e.target.value)}
                error={isInvalid}
                fieldSize={selectFieldSize}
                className={inputClassName}
              >
                <option value="">Bitte wählen</option>
                {optionValues.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </Select>
            ) : field.fieldType === "MULTISELECT" && optionValues.length > 0 ? (
              <div
                role="group"
                aria-labelledby={labelId}
                aria-describedby={describedBy}
                data-invalid={isInvalid || undefined}
                className={cn(
                  "space-y-2 border-2 px-3 py-2.5",
                  isInvalid
                    ? "border-red-700 dark:border-red-400"
                    : "border-rule dark:border-night-rule",
                  choiceContainerClassName,
                )}
              >
                {optionValues.map((opt, optIndex) => {
                  const selected = asStringArray(fieldValue);
                  const checked = selected.includes(opt);
                  return (
                    <Checkbox
                      key={opt}
                      id={`${controlId}-${optIndex}`}
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...selected, opt]
                          : selected.filter((v) => v !== opt);
                        // Course option order keeps values stable for export.
                        setField(
                          field.fieldName,
                          optionValues.filter((o) => next.includes(o)),
                        );
                      }}
                      className="min-h-0"
                    >
                      <span className="text-sm leading-snug">{opt}</span>
                    </Checkbox>
                  );
                })}
              </div>
            ) : field.fieldType === "CHECKBOX" ? (
              <div
                role="group"
                aria-labelledby={labelId}
                aria-describedby={describedBy}
                data-invalid={isInvalid || undefined}
                className={cn(
                  "border-2 px-3 py-2.5",
                  isInvalid
                    ? "border-red-700 dark:border-red-400"
                    : "border-rule dark:border-night-rule",
                  choiceContainerClassName,
                )}
              >
                <Checkbox
                  id={`${controlId}-checkbox`}
                  required={field.isRequired}
                  checked={fieldValue === true || fieldValue === "true"}
                  onChange={(e) => setField(field.fieldName, e.target.checked)}
                  className="min-h-0"
                >
                  <span className="text-sm leading-snug">
                    {field.helpText?.trim() ? field.helpText : "Ja, trifft zu"}
                  </span>
                </Checkbox>
              </div>
            ) : field.fieldType === "TEXTAREA" ? (
              <Textarea
                {...controlA11y}
                value={fieldValue != null ? String(fieldValue) : ""}
                onChange={(e) => setField(field.fieldName, e.target.value)}
                rows={3}
                className={cn(
                  inputClassName,
                  isInvalid && "border-red-700! dark:border-red-400!",
                )}
                placeholder={field.helpText ?? ""}
              />
            ) : (
              <Input
                {...controlA11y}
                type={inputTypeFor(String(field.fieldType))}
                value={fieldValue != null ? String(fieldValue) : ""}
                onChange={(e) => setField(field.fieldName, e.target.value)}
                min={field.fieldType === "YEAR" ? YEAR_MIN : undefined}
                max={field.fieldType === "YEAR" ? YEAR_MAX : undefined}
                step={field.fieldType === "YEAR" ? 1 : undefined}
                className={cn(
                  inputClassName,
                  isInvalid && "border-red-700! dark:border-red-400!",
                )}
                placeholder={
                  field.fieldType === "YEAR"
                    ? (field.helpText ?? "z.B. 2015")
                    : (field.helpText ?? "")
                }
              />
            )}
            {showsHelp ? (
              <p
                id={helpId}
                className="text-dark dark:text-night-muted mt-1 text-xs"
              >
                {field.helpText}
              </p>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
