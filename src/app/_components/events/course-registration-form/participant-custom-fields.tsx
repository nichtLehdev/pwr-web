"use client";

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

/**
 * Überschreibt die gerundeten `ui/`-Inputs (`Input`, `Select`, `Textarea`) mit
 * dem Programmheft-Feld — `cn` mergt nur, es entfernt keine widersprüchlichen
 * Utilities, deshalb per `!`-Wichtigkeit statt Klassenreihenfolge.
 */
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
}: ParticipantCustomFieldsProps) {
  if (fields.length === 0) {
    return null;
  }

  const values = asCustomFieldsRecord(customFields);

  const setField = (fieldName: string, value: unknown) => {
    onChange({ ...values, [fieldName]: value });
  };

  return (
    <>
      {fields.map((field) => {
        const isInvalid = invalidFieldNames.includes(field.fieldName);
        const fieldValue = getCustomFieldValue(customFields, field.fieldName);
        const optionValues = parseSelectOptionValues(field.options);

        return (
          <div key={field.fieldName} className="md:col-span-2">
            <Label className={labelClassName} required={field.isRequired}>
              {field.fieldName}
            </Label>
            {field.fieldType === "SELECT" && optionValues.length > 0 ? (
              <Select
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
                className={cn(
                  "space-y-2 border-2 px-3 py-2.5",
                  isInvalid
                    ? "border-red-700 dark:border-red-400"
                    : "border-rule dark:border-night-rule",
                  choiceContainerClassName,
                )}
              >
                {optionValues.map((opt) => {
                  const selected = asStringArray(fieldValue);
                  const checked = selected.includes(opt);
                  return (
                    <Checkbox
                      key={opt}
                      id={`${field.fieldName}-${opt}`}
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
                className={cn(
                  "border-2 px-3 py-2.5",
                  isInvalid
                    ? "border-red-700 dark:border-red-400"
                    : "border-rule dark:border-night-rule",
                  choiceContainerClassName,
                )}
              >
                <Checkbox
                  id={`${field.fieldName}-checkbox`}
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
            {field.helpText && field.fieldType !== "CHECKBOX" ? (
              <p className="text-dark dark:text-night-muted mt-1 text-xs">
                {field.helpText}
              </p>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
