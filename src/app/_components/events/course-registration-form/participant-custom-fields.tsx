"use client";

import { Input, Label, Textarea, Select } from "@/app/_components/ui";
import {
  parseSelectOptionValues,
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

type ParticipantCustomFieldsProps = {
  fields: readonly CourseCustomFieldRule[];
  customFields: unknown;
  onChange: (next: Record<string, unknown>) => void;
  invalidFieldNames?: string[];
  labelClassName?: string;
  inputClassName?: string;
};

export function ParticipantCustomFields({
  fields,
  customFields,
  onChange,
  invalidFieldNames = [],
  labelClassName = "text-dark dark:text-dark-text mb-1 block text-sm font-medium",
  inputClassName = "focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary text-dark dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:ring-1 focus:outline-none",
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

        return (
          <div key={field.fieldName} className="md:col-span-2">
            <Label className={labelClassName} required={field.isRequired}>
              {field.fieldName}
            </Label>
            {field.fieldType === "SELECT" &&
            parseSelectOptionValues(field.options).length > 0 ? (
              <Select
                value={fieldValue != null ? String(fieldValue) : ""}
                onChange={(e) => setField(field.fieldName, e.target.value)}
                error={isInvalid}
                className={inputClassName}
              >
                <option value="">Bitte wählen</option>
                {parseSelectOptionValues(field.options).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </Select>
            ) : field.fieldType === "CHECKBOX" ? (
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm",
                  isInvalid
                    ? "border-red-500 dark:border-red-500"
                    : "dark:border-dark-border border-gray-300",
                  "dark:bg-dark-background-secondary bg-white",
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
                type={field.fieldType === "NUMBER" ? "number" : "text"}
                value={fieldValue != null ? String(fieldValue) : ""}
                onChange={(e) => setField(field.fieldName, e.target.value)}
                className={cn(
                  inputClassName,
                  isInvalid && "border-red-500 dark:border-red-500",
                )}
                placeholder={field.helpText ?? ""}
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
