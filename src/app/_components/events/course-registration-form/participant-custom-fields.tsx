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
  labelClassName = "text-dark dark:text-dark-text mb-1 block text-sm font-medium",
  inputClassName = "focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:ring-1 focus:outline-none",
  selectFieldSize,
  choiceContainerClassName = "dark:bg-dark-background-secondary bg-white",
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
                  "space-y-2 rounded-lg border px-3 py-2.5",
                  isInvalid
                    ? "border-red-500 dark:border-red-500"
                    : "dark:border-dark-border border-gray-300",
                  choiceContainerClassName,
                )}
              >
                {optionValues.map((opt) => {
                  const selected = asStringArray(fieldValue);
                  const checked = selected.includes(opt);
                  return (
                    <label
                      key={opt}
                      className="flex cursor-pointer items-start gap-2.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="text-primary focus:ring-primary mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300"
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
                      />
                      <span className="text-dark dark:text-dark-text leading-snug">
                        {opt}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : field.fieldType === "CHECKBOX" ? (
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm",
                  isInvalid
                    ? "border-red-500 dark:border-red-500"
                    : "dark:border-dark-border border-gray-300",
                  choiceContainerClassName,
                )}
              >
                <input
                  type="checkbox"
                  className="text-primary focus:ring-primary mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300"
                  checked={fieldValue === true || fieldValue === "true"}
                  onChange={(e) => setField(field.fieldName, e.target.checked)}
                />
                <span className="text-dark dark:text-dark-text leading-snug">
                  {field.helpText?.trim() ? field.helpText : "Ja, trifft zu"}
                </span>
              </label>
            ) : field.fieldType === "TEXTAREA" ? (
              <Textarea
                value={fieldValue != null ? String(fieldValue) : ""}
                onChange={(e) => setField(field.fieldName, e.target.value)}
                rows={3}
                className={cn(
                  inputClassName,
                  isInvalid && "border-red-500 dark:border-red-500",
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
                  isInvalid && "border-red-500 dark:border-red-500",
                )}
                placeholder={
                  field.fieldType === "YEAR"
                    ? (field.helpText ?? "z.B. 2015")
                    : (field.helpText ?? "")
                }
              />
            )}
            {field.helpText && field.fieldType !== "CHECKBOX" ? (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {field.helpText}
              </p>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
