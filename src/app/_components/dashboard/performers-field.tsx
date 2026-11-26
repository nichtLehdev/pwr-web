"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, PlusIcon, TrashIcon } from "lucide-react";
import { Select } from "@/app/_components/ui";
import { api } from "@/trpc/react";
import {
  MAX_PERFORMERS,
  PERFORMER_TYPE_LABELS,
  PERFORMER_TYPES,
  type PerformerInput,
  type PerformerType,
} from "@/lib/event-performers";

/** Eine Zeile im Formular. `search` ist der Text im Suchfeld eines verknüpften Typs. */
export type PerformerDraft = {
  key: string;
  type: PerformerType;
  ensembleId: string;
  auswahlChorId: string;
  name: string;
  search: string;
};

let draftCounter = 0;
function newKey(): string {
  draftCounter += 1;
  return `performer-${Date.now()}-${draftCounter}`;
}

export function emptyPerformerDraft(type: PerformerType): PerformerDraft {
  return {
    key: newKey(),
    type,
    ensembleId: "",
    auswahlChorId: "",
    name: "",
    search: "",
  };
}

/** Gespeicherte Mitwirkende eines Termins als Formularzeilen. */
export function performerDraftsFromEvent(
  performers:
    | readonly {
        type: PerformerType;
        ensembleId: string | null;
        auswahlChorId: string | null;
        name: string;
        ensemble?: { name: string } | null;
        auswahlChor?: { name: string } | null;
      }[]
    | null
    | undefined,
): PerformerDraft[] {
  return (performers ?? []).map((p) => {
    const linkedName = p.ensemble?.name ?? p.auswahlChor?.name ?? p.name;
    return {
      key: newKey(),
      type: p.type,
      ensembleId: p.ensembleId ?? "",
      auswahlChorId: p.auswahlChorId ?? "",
      name: p.type === "CUSTOM" ? p.name : "",
      search: p.type === "CUSTOM" ? "" : linkedName,
    };
  });
}

/**
 * Lokal gespeicherte Entwürfe: neue haben `performers`, ältere (vor mehreren
 * Mitwirkenden) die Einzelfelder. Beide werden zu Formularzeilen.
 */
export function performerDraftsFromSaved(saved: {
  performers?: PerformerDraft[];
  performingEnsembleType?: PerformerType | null;
  ensembleId?: string;
  ensembleSearch?: string;
  auswahlChorId?: string;
  auswahlChorSearch?: string;
  performingEnsembleName?: string;
}): PerformerDraft[] {
  if (Array.isArray(saved.performers)) {
    return saved.performers.map((p) => ({ ...p, key: p.key || newKey() }));
  }
  if (!saved.performingEnsembleType) return [];
  return [
    {
      key: newKey(),
      type: saved.performingEnsembleType,
      ensembleId: saved.ensembleId ?? "",
      auswahlChorId: saved.auswahlChorId ?? "",
      name: saved.performingEnsembleName ?? "",
      search:
        saved.performingEnsembleType === "ENSEMBLE"
          ? (saved.ensembleSearch ?? "")
          : (saved.auswahlChorSearch ?? ""),
    },
  ];
}

/** Was an die API geht; leere Zeilen räumt der Server selbst weg. */
export function performerDraftsToInput(
  drafts: readonly PerformerDraft[],
): PerformerInput[] {
  return drafts.map((d) => ({
    type: d.type,
    ensembleId: d.type === "ENSEMBLE" ? d.ensembleId || null : null,
    auswahlChorId: d.type === "AUSWAHLCHOR" ? d.auswahlChorId || null : null,
    name: d.type === "CUSTOM" ? d.name.trim() || null : null,
  }));
}

const inputClass =
  "border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper block w-full border px-3 py-2 text-sm";
const dropdownClass =
  "border-rule dark:border-night-rule dark:bg-night-raised bg-paper absolute z-10 mt-1 w-full overflow-hidden border";
const optionClass =
  "hover:bg-rule/25 dark:hover:bg-night-rule block w-full px-4 py-2 text-left text-sm";
const iconButtonClass =
  "text-dark dark:text-night-muted hover:bg-rule/50 dark:hover:bg-night-rule p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-30";

type PerformersFieldProps = {
  value: PerformerDraft[];
  onChange: (value: PerformerDraft[]) => void;
  /** Auswahlchöre verknüpfen dürfen nur Prüfende. */
  allowAuswahlchor: boolean;
  /** Ensembles, die verknüpft werden dürfen; `null` heißt alle. */
  bezirkIds: string[] | null;
};

export function PerformersField({
  value,
  onChange,
  allowAuswahlchor,
  bezirkIds,
}: PerformersFieldProps) {
  const types = PERFORMER_TYPES.filter(
    (t) => allowAuswahlchor || t !== "AUSWAHLCHOR",
  );

  const { data: auswahlchoereData } = api.auswahlchoere.getAll.useQuery(
    {},
    { enabled: allowAuswahlchor },
  );
  const auswahlchoere = auswahlchoereData?.auswahlchoere ?? [];

  const update = (index: number, patch: Partial<PerformerDraft>) => {
    onChange(value.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };
  const move = (index: number, by: -1 | 1) => {
    const target = index + by;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="text-dark dark:text-night-muted text-sm">
          Noch keine Mitwirkenden eingetragen.
        </p>
      )}

      {value.map((draft, index) => (
        <div
          key={draft.key}
          className="border-rule dark:border-night-rule dark:bg-night-raised bg-rule/25 flex flex-col gap-3 border p-4 sm:flex-row sm:items-end"
        >
          <div className="sm:w-56">
            <label className="text-dark dark:text-night-muted mb-1 block text-xs font-medium">
              Art
            </label>
            <Select
              value={draft.type}
              onChange={(e) =>
                update(index, {
                  type: e.target.value as PerformerType,
                  ensembleId: "",
                  auswahlChorId: "",
                  search: "",
                })
              }
              className="text-sm"
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {PERFORMER_TYPE_LABELS[t]}
                </option>
              ))}
              {/* Eine gespeicherte Auswahlchor-Zeile bleibt sichtbar, auch ohne Recht. */}
              {!types.includes(draft.type) && (
                <option value={draft.type}>
                  {PERFORMER_TYPE_LABELS[draft.type]}
                </option>
              )}
            </Select>
          </div>

          <div className="min-w-0 flex-1">
            {draft.type === "ENSEMBLE" && (
              <EnsemblePicker
                search={draft.search}
                selected={Boolean(draft.ensembleId)}
                bezirkIds={bezirkIds}
                onSearch={(search) =>
                  update(index, {
                    search,
                    ...(search ? {} : { ensembleId: "" }),
                  })
                }
                onSelect={(ensemble) =>
                  update(index, {
                    ensembleId: ensemble.id,
                    search: ensemble.name,
                  })
                }
              />
            )}
            {draft.type === "AUSWAHLCHOR" && (
              <ListPicker
                label="Auswahlchor"
                placeholder="Suche nach einem Auswahlchor..."
                emptyText="Keine Auswahlchöre gefunden"
                search={draft.search}
                selected={Boolean(draft.auswahlChorId)}
                options={auswahlchoere
                  .filter((c) =>
                    c.name.toLowerCase().includes(draft.search.toLowerCase()),
                  )
                  .map((c) => ({ id: c.id, name: c.name }))}
                onSearch={(search) =>
                  update(index, {
                    search,
                    ...(search ? {} : { auswahlChorId: "" }),
                  })
                }
                onSelect={(chor) =>
                  update(index, { auswahlChorId: chor.id, search: chor.name })
                }
              />
            )}
            {draft.type === "CUSTOM" && (
              <div>
                <label className="text-dark dark:text-night-muted mb-1 block text-xs font-medium">
                  Name
                </label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => update(index, { name: e.target.value })}
                  placeholder="z.B. Posaunenchor Beispielstadt"
                  className={inputClass}
                />
              </div>
            )}
          </div>

          <div className="flex items-center">
            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={index === 0}
              className={iconButtonClass}
              title="Nach oben"
              aria-label="Nach oben"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={index === value.length - 1}
              className={iconButtonClass}
              title="Nach unten"
              aria-label="Nach unten"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              className="p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
              title="Entfernen"
              aria-label="Entfernen"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {!allowAuswahlchor ? (
          <p className="text-dark dark:text-night-muted text-xs">
            Du kannst Ensembles aus deinem Bezirk verknüpfen. Gäste von
            außerhalb trägst du mit freiem Namen ein.
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          disabled={value.length >= MAX_PERFORMERS}
          onClick={() => onChange([...value, emptyPerformerDraft("ENSEMBLE")])}
          className="bg-rule/25 dark:bg-night-raised text-ink dark:text-night-text hover:bg-rule/50 dark:hover:bg-night-rule inline-flex min-h-11 items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlusIcon className="h-4 w-4" />
          Mitwirkende hinzufügen
        </button>
      </div>
    </div>
  );
}

function EnsemblePicker({
  search,
  selected,
  bezirkIds,
  onSearch,
  onSelect,
}: {
  search: string;
  selected: boolean;
  bezirkIds: string[] | null;
  onSearch: (search: string) => void;
  onSelect: (ensemble: { id: string; name: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data } = api.ensembles.getAll.useQuery(
    {
      limit: 100,
      search: (open && !selected && search) || undefined,
      // Derselbe Zuschnitt, den der Server beim Speichern prüft.
      bezirkIds: bezirkIds ?? undefined,
    },
    {
      enabled: open,
      // Ohne die alte Liste klappt das Dropdown bei jedem Tastendruck zu.
      placeholderData: (prev) => prev,
    },
  );

  // Die Suche läuft auf dem Server; dessen Treffer aus der Beschreibung
  // gehören nicht in eine Namenssuche.
  const options = (data?.ensembles ?? [])
    .filter((e) =>
      selected ? true : e.name.toLowerCase().includes(search.toLowerCase()),
    )
    .map((e) => ({
      id: e.id,
      name: e.name,
      hint: e.bezirk ? `Bezirk ${e.bezirk.number}` : undefined,
    }));

  return (
    <ListPicker
      label="Posaunenchor / Ensemble"
      placeholder="Suche nach einem Ensemble..."
      emptyText="Keine Ensembles gefunden"
      search={search}
      selected={selected}
      options={options}
      onOpenChange={setOpen}
      onSearch={onSearch}
      onSelect={onSelect}
    />
  );
}

function ListPicker({
  label,
  placeholder,
  emptyText,
  search,
  selected,
  options,
  onOpenChange,
  onSearch,
  onSelect,
}: {
  label: string;
  placeholder: string;
  emptyText: string;
  search: string;
  selected: boolean;
  options: { id: string; name: string; hint?: string }[];
  onOpenChange?: (open: boolean) => void;
  onSearch: (search: string) => void;
  onSelect: (option: { id: string; name: string }) => void;
}) {
  const [open, setOpenState] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const setOpen = (next: boolean) => {
    setOpenState(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpenState(false);
        onOpenChange?.(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open, onOpenChange]);

  return (
    <div className="relative" ref={ref}>
      <label className="text-dark dark:text-night-muted mb-1 block text-xs font-medium">
        {label}
        {!selected && search && (
          <span className="ml-2 text-amber-700 dark:text-amber-400">
            (noch nicht ausgewählt)
          </span>
        )}
      </label>
      <input
        type="text"
        value={search}
        onChange={(e) => {
          onSearch(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={inputClass}
      />
      {open && (
        <div className={dropdownClass}>
          <div className="overflow-y-auto" style={{ maxHeight: "240px" }}>
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onSelect(option);
                  setOpen(false);
                }}
                className={optionClass}
              >
                <span className="text-ink dark:text-night-text font-medium">
                  {option.name}
                </span>
                {option.hint && (
                  <span className="text-dark dark:text-night-muted">
                    {" "}
                    – {option.hint}
                  </span>
                )}
              </button>
            ))}
            {options.length === 0 && (
              <div className="text-dark dark:text-night-muted px-4 py-3 text-sm">
                {emptyText}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
