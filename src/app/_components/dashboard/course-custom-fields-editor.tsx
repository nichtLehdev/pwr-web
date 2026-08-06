"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BookmarkCheck,
  BookmarkPlus,
  Library,
  TrashIcon,
  X,
} from "lucide-react";
import { api } from "@/trpc/react";
import { useToast } from "@/app/_components/ui/toast";
import { getErrorMessage } from "@/lib/utils";
import {
  customFieldTypeNeedsOptions,
  parseSelectOptionValues,
} from "@/lib/course-custom-fields";
import { Select } from "@/app/_components/ui";
import { CustomFieldType } from "~/generated/prisma/enums";

export const customFieldTypeLabels: Record<CustomFieldType, string> = {
  TEXT: "Text",
  TEXTAREA: "Mehrzeiliger Text",
  NUMBER: "Zahl",
  DATE: "Datum",
  YEAR: "Jahr",
  TIME: "Uhrzeit",
  PHONE: "Telefonnummer",
  EMAIL: "E-Mail-Adresse",
  SELECT: "Auswahl",
  MULTISELECT: "Mehrfachauswahl",
  CHECKBOX: "Checkbox",
};

export interface CourseCustomFieldDraft {
  id: string;
  fieldName: string;
  fieldType: CustomFieldType;
  options: string;
  isRequired: boolean;
  helpText: string;
  sortOrder: number;
}

type CourseCustomFieldsEditorProps = {
  fields: CourseCustomFieldDraft[];
  onChange: (next: CourseCustomFieldDraft[]) => void;
  /** Locks the editor (edit page once registrations exist). */
  disabled?: boolean;
};

const inputClassName =
  "focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text dark:disabled:bg-dark-background block w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:text-gray-500";

const normalizeName = (name: string) => name.trim().toLowerCase();

/**
 * Client-only placeholder id; the server assigns real ids on save. The random
 * prefix keeps ids from restored autosave drafts (previous page load) unique.
 */
const draftIdPrefix = Math.random().toString(36).slice(2, 8);
let draftIdCounter = 0;
const nextDraftId = () => `new-${draftIdPrefix}-${++draftIdCounter}`;

/**
 * Editor for a course's registration fields, backed by the global field
 * library: fields can be pulled from the library and saved back to it.
 * Library entries are copied into the course, so the course keeps its own
 * version even if the library changes later.
 */
export function CourseCustomFieldsEditor({
  fields,
  onChange,
  disabled = false,
}: CourseCustomFieldsEditorProps) {
  const toast = useToast();
  const utils = api.useUtils();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [savingFieldId, setSavingFieldId] = useState<string | null>(null);

  const { data: templates, isLoading: templatesLoading } =
    api.customFieldTemplates.getAll.useQuery(undefined, {
      enabled: libraryOpen && !disabled,
    });

  const createTemplate = api.customFieldTemplates.create.useMutation({
    onSuccess: (template) => {
      toast.success(
        template.isGlobal
          ? `"${template.fieldName}" in der Bibliothek gespeichert`
          : `"${template.fieldName}" gespeichert – für andere sichtbar, sobald ein Kurs mit diesem Feld freigegeben ist`,
      );
      void utils.customFieldTemplates.getAll.invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
    onSettled: () => setSavingFieldId(null),
  });

  const deleteTemplate = api.customFieldTemplates.delete.useMutation({
    onSuccess: () => {
      toast.success("Feld aus der Bibliothek entfernt");
      void utils.customFieldTemplates.getAll.invalidate();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const templateNames = useMemo(
    () => new Set((templates ?? []).map((t) => normalizeName(t.fieldName))),
    [templates],
  );
  const fieldNames = useMemo(
    () => new Set(fields.map((f) => normalizeName(f.fieldName))),
    [fields],
  );

  const addField = () => {
    onChange([
      ...fields,
      {
        id: nextDraftId(),
        fieldName: "",
        fieldType: CustomFieldType.TEXT,
        options: "",
        isRequired: false,
        helpText: "",
        sortOrder: fields.length,
      },
    ]);
  };

  const addFromLibrary = (template: {
    id: string;
    fieldName: string;
    fieldType: CustomFieldType;
    options: unknown;
    isRequired: boolean;
    helpText: string | null;
  }) => {
    onChange([
      ...fields,
      {
        id: nextDraftId(),
        fieldName: template.fieldName,
        fieldType: template.fieldType,
        options: parseSelectOptionValues(template.options).join(", "),
        isRequired: template.isRequired,
        helpText: template.helpText ?? "",
        sortOrder: fields.length,
      },
    ]);
  };

  const updateField = (
    id: string,
    field: keyof CourseCustomFieldDraft,
    value: string | boolean | number | CustomFieldType,
  ) => {
    onChange(
      fields.map((cf) => (cf.id === id ? { ...cf, [field]: value } : cf)),
    );
  };

  const removeField = (id: string) => {
    onChange(fields.filter((cf) => cf.id !== id));
  };

  const moveField = (id: string, direction: "up" | "down") => {
    const index = fields.findIndex((cf) => cf.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === fields.length - 1)
    ) {
      return;
    }

    const newFields = [...fields];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    [newFields[index], newFields[newIndex]] = [
      newFields[newIndex]!,
      newFields[index]!,
    ];

    onChange(newFields.map((cf, i) => ({ ...cf, sortOrder: i })));
  };

  const saveToLibrary = (field: CourseCustomFieldDraft) => {
    if (!field.fieldName.trim()) {
      toast.error("Bitte zuerst einen Feldnamen eingeben");
      return;
    }
    if (
      customFieldTypeNeedsOptions(field.fieldType) &&
      parseSelectOptionValues(field.options).length === 0
    ) {
      toast.error("Bitte zuerst Auswahloptionen eingeben");
      return;
    }
    setSavingFieldId(field.id);
    createTemplate.mutate({
      fieldName: field.fieldName.trim(),
      fieldType: field.fieldType,
      options: field.options.trim() || undefined,
      isRequired: field.isRequired,
      helpText: field.helpText.trim() || undefined,
    });
  };

  return (
    <>
      {!disabled ? (
        <div className="-mt-2 mb-4 flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => setLibraryOpen((open) => !open)}
            className="text-primary hover:text-primary/80 inline-flex items-center gap-1.5 text-sm font-medium"
          >
            <Library className="h-4 w-4" />
            Aus Bibliothek
          </button>
          <button
            type="button"
            onClick={addField}
            className="text-primary hover:text-primary/80 text-sm font-medium"
          >
            + Feld hinzufügen
          </button>
        </div>
      ) : null}

      {libraryOpen && !disabled ? (
        <div className="dark:border-dark-border dark:bg-dark-background-secondary mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="dark:text-dark-text text-sm font-medium text-gray-700">
                Feld-Bibliothek
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Beim Hinzufügen wird eine Kopie in den Kurs übernommen. Eigene
                Felder sind erst für alle sichtbar, sobald ein Kurs mit dem Feld
                freigegeben wurde.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLibraryOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
              aria-label="Bibliothek schließen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {templatesLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Lade Bibliothek…
            </p>
          ) : !templates || templates.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Noch keine Felder in der Bibliothek. Speichere ein Feld über das
              Lesezeichen-Symbol, um es hier für alle verfügbar zu machen.
            </p>
          ) : (
            <ul className="space-y-2">
              {templates.map((template) => {
                const alreadyAdded = fieldNames.has(
                  normalizeName(template.fieldName),
                );
                return (
                  <li
                    key={template.id}
                    className="dark:border-dark-border dark:bg-dark-background flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="dark:text-dark-text truncate text-sm font-medium text-gray-800">
                        {template.fieldName}
                        {template.isRequired ? (
                          <span className="text-red-500"> *</span>
                        ) : null}
                        {!template.isGlobal ? (
                          <span
                            className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-gray-500 uppercase dark:bg-gray-700 dark:text-gray-300"
                            title="Nur für dich sichtbar, bis ein Kurs mit diesem Feld freigegeben wurde"
                          >
                            Privat
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {customFieldTypeLabels[template.fieldType]}
                        {customFieldTypeNeedsOptions(template.fieldType)
                          ? `: ${parseSelectOptionValues(template.options).join(", ")}`
                          : template.helpText
                            ? ` – ${template.helpText}`
                            : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addFromLibrary(template)}
                      disabled={alreadyAdded}
                      className="text-primary hover:text-primary/80 shrink-0 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {alreadyAdded ? "Hinzugefügt" : "+ Hinzufügen"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `"${template.fieldName}" für alle aus der Bibliothek löschen? Bestehende Kurse behalten ihre Felder.`,
                          )
                        ) {
                          deleteTemplate.mutate({ id: template.id });
                        }
                      }}
                      disabled={deleteTemplate.isPending}
                      className="shrink-0 p-1 text-gray-400 hover:text-red-500 disabled:opacity-40"
                      aria-label={`${template.fieldName} aus Bibliothek löschen`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

      {fields.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Keine zusätzlichen Felder definiert.
        </p>
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => {
            const inLibrary = templateNames.has(normalizeName(field.fieldName));
            return (
              <div
                key={field.id}
                className={`rounded-lg border p-4 ${
                  disabled
                    ? "dark:border-dark-border dark:bg-dark-background-secondary border-gray-100 bg-gray-50"
                    : "dark:border-dark-border border-gray-200"
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Feld {index + 1}
                  </span>
                  {!disabled && (
                    <div className="flex items-center gap-1">
                      {inLibrary ? (
                        <span
                          className="p-1 text-gray-400"
                          title="Bereits in der Bibliothek"
                        >
                          <BookmarkCheck className="h-4 w-4" />
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => saveToLibrary(field)}
                          disabled={
                            createTemplate.isPending &&
                            savingFieldId === field.id
                          }
                          className="hover:text-primary p-1 text-gray-400 disabled:opacity-40"
                          title="In Bibliothek speichern (für alle verfügbar)"
                        >
                          <BookmarkPlus className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => moveField(field.id, "up")}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <ArrowUpIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveField(field.id, "down")}
                        disabled={index === fields.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <ArrowDownIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeField(field.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                      Feldname *
                    </label>
                    <input
                      type="text"
                      value={field.fieldName}
                      onChange={(e) =>
                        updateField(field.id, "fieldName", e.target.value)
                      }
                      placeholder="z.B. Ernährungsbesonderheiten"
                      disabled={disabled}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                      Feldtyp
                    </label>
                    <Select
                      value={field.fieldType}
                      onChange={(e) =>
                        updateField(
                          field.id,
                          "fieldType",
                          e.target.value as CustomFieldType,
                        )
                      }
                      disabled={disabled}
                      className={inputClassName}
                    >
                      {Object.entries(customFieldTypeLabels).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </Select>
                  </div>

                  {customFieldTypeNeedsOptions(field.fieldType) && (
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                        Auswahloptionen (kommagetrennt)
                      </label>
                      <input
                        type="text"
                        value={field.options}
                        onChange={(e) =>
                          updateField(field.id, "options", e.target.value)
                        }
                        placeholder="z.B. Option 1, Option 2, Option 3"
                        disabled={disabled}
                        className={inputClassName}
                      />
                    </div>
                  )}

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                      Hilfetext
                    </label>
                    <input
                      type="text"
                      value={field.helpText}
                      onChange={(e) =>
                        updateField(field.id, "helpText", e.target.value)
                      }
                      placeholder="z.B. Bitte gib eventuelle Allergien an"
                      disabled={disabled}
                      className={inputClassName}
                    />
                  </div>

                  <div>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={field.isRequired}
                        onChange={(e) =>
                          updateField(field.id, "isRequired", e.target.checked)
                        }
                        disabled={disabled}
                        className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                      />
                      <span className="dark:text-dark-text text-sm text-gray-700">
                        Pflichtfeld
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
