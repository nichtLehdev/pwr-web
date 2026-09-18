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
import { Tag } from "@/app/_components/programmheft/tag";
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
  "border-ink dark:border-night-text dark:bg-night dark:text-night-text block w-full border bg-paper px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50";

const normalizeName = (name: string) => name.trim().toLowerCase();

/**
 * Client-only placeholder id; the server assigns real ids on save. The random
 * prefix keeps ids from restored autosave drafts (previous page load) unique.
 */
const draftIdPrefix = Math.random().toString(36).slice(2, 8);
let draftIdCounter = 0;
const nextDraftId = () => `new-${draftIdPrefix}-${++draftIdCounter}`;

/**
 * Editor for a course's registration fields, backed by the global field library.
 * Library entries are copied, so later library changes don't affect the course.
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
            className="text-primary-ink dark:text-primary inline-flex min-h-11 items-center gap-1.5 text-sm font-medium hover:underline"
          >
            <Library className="h-4 w-4" />
            Aus Bibliothek
          </button>
          <button
            type="button"
            onClick={addField}
            className="text-primary-ink dark:text-primary min-h-11 text-sm font-medium hover:underline"
          >
            + Feld hinzufügen
          </button>
        </div>
      ) : null}

      {libraryOpen && !disabled ? (
        <div className="border-rule dark:border-night-rule dark:bg-night-raised bg-rule/25 mb-4 border p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-ink dark:text-night-text text-sm font-medium">
                Feld-Bibliothek
              </p>
              <p className="text-dark dark:text-night-muted text-xs">
                Beim Hinzufügen wird eine Kopie in den Kurs übernommen. Eigene
                Felder sind erst für alle sichtbar, sobald ein Kurs mit dem Feld
                freigegeben wurde.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLibraryOpen(false)}
              className="text-dark dark:text-night-muted hover:text-ink dark:hover:text-night-text p-1"
              aria-label="Bibliothek schließen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {templatesLoading ? (
            <p className="text-dark dark:text-night-muted text-sm">
              Lade Bibliothek…
            </p>
          ) : !templates || templates.length === 0 ? (
            <p className="text-dark dark:text-night-muted text-sm">
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
                    className="border-rule dark:border-night-rule dark:bg-night bg-paper flex items-center gap-3 border px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-ink dark:text-night-text truncate text-sm font-medium">
                        {template.fieldName}
                        {template.isRequired ? (
                          <span className="text-red-500"> *</span>
                        ) : null}
                        {!template.isGlobal ? (
                          <span
                            className="ml-2 inline-block"
                            title="Nur für dich sichtbar, bis ein Kurs mit diesem Feld freigegeben wurde"
                          >
                            <Tag tone="inverse">Privat</Tag>
                          </span>
                        ) : null}
                      </p>
                      <p className="text-dark dark:text-night-muted truncate text-xs">
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
                      className="text-primary-ink dark:text-primary shrink-0 text-sm font-medium hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:no-underline"
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
                      className="text-dark dark:text-night-muted shrink-0 p-1 hover:text-red-500 disabled:opacity-40"
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
        <p className="text-dark dark:text-night-muted text-sm">
          Keine zusätzlichen Felder definiert.
        </p>
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => {
            const inLibrary = templateNames.has(normalizeName(field.fieldName));
            return (
              <div
                key={field.id}
                className={`border p-4 ${
                  disabled
                    ? "border-rule dark:border-night-rule dark:bg-night-raised bg-rule/25"
                    : "border-rule dark:border-night-rule"
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-dark dark:text-night-muted text-sm font-medium">
                    Feld {index + 1}
                  </span>
                  {!disabled && (
                    <div className="flex items-center gap-1">
                      {inLibrary ? (
                        <span
                          className="text-dark dark:text-night-muted p-1"
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
                          className="text-dark dark:text-night-muted hover:text-primary-ink dark:hover:text-primary p-1 disabled:opacity-40"
                          title="In Bibliothek speichern (für alle verfügbar)"
                        >
                          <BookmarkPlus className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => moveField(field.id, "up")}
                        disabled={index === 0}
                        className="text-dark dark:text-night-muted hover:text-ink dark:hover:text-night-text p-1 disabled:opacity-30"
                      >
                        <ArrowUpIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveField(field.id, "down")}
                        disabled={index === fields.length - 1}
                        className="text-dark dark:text-night-muted hover:text-ink dark:hover:text-night-text p-1 disabled:opacity-30"
                      >
                        <ArrowDownIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeField(field.id)}
                        className="text-dark dark:text-night-muted p-1 hover:text-red-500"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-dark dark:text-night-muted mb-1 block text-xs font-medium">
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
                    <label className="text-dark dark:text-night-muted mb-1 block text-xs font-medium">
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
                      className="w-full text-sm"
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
                      <label className="text-dark dark:text-night-muted mb-1 block text-xs font-medium">
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
                    <label className="text-dark dark:text-night-muted mb-1 block text-xs font-medium">
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
                        className="text-primary border-rule dark:border-night-rule h-4 w-4"
                      />
                      <span className="text-ink dark:text-night-text text-sm">
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
