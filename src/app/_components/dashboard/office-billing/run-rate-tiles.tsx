"use client";

import { useState } from "react";
import { Settings2, X } from "lucide-react";
import { useToast } from "@/app/_components/ui/toast";
import { Tag } from "@/app/_components/programmheft/tag";
import { Button, Input } from "@/app/_components/ui";
import {
  euroInput,
  parseEuroInput,
} from "@/app/_components/dashboard/office-billing-ui";

export interface RunRateTile {
  key: string;
  label: string;
  hint?: string;
  /** Wert laut Tabelle; null, wenn sie keinen lesbaren hatte. */
  sheetValue: number | null;
  /** Wert im Lauf; null heißt: fehlt, blockiert das Ausstellen. */
  value: number | null;
  /** Im Lauf angepasst statt aus der Tabelle. */
  manual: boolean;
}

/**
 * Sätze eines Laufs. Zugeklappt nur eine Zeile mit den geltenden Werten; die
 * Kacheln zum Ändern öffnen sich über die Schaltfläche (oder von selbst, wenn
 * ein Satz fehlt). Beim Hochladen stehen dort die Werte der Tabelle; im Entwurf
 * lassen sie sich anpassen und mit „Tabellenwert nutzen“ zurücksetzen. Leeres
 * Feld heißt ebenfalls „wie in der Tabelle“.
 */
export function RunRateTiles({
  title,
  description,
  tiles,
  unit = "€",
  preview,
  editLabel = "Sätze anpassen",
  onSave,
}: {
  title: string;
  /** Beschriftung der Schaltfläche, z.B. "Prämien anpassen". */
  editLabel?: string;
  description: string;
  tiles: RunRateTile[];
  /** Hinter dem Eingabefeld, z.B. "€ netto". */
  unit?: string;
  /** Zusatz unter dem Feld, z.B. der Bruttopreis. */
  preview?: (value: number) => string;
  onSave: (changes: Record<string, number | null>) => Promise<unknown>;
}) {
  const toast = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const anyMissing = tiles.some((tile) => tile.value === null);
  const [open, setOpen] = useState(anyMissing);
  const manualCount = tiles.filter((tile) => tile.manual).length;

  const valueFor = (tile: RunRateTile) =>
    drafts[tile.key] ??
    (tile.manual && tile.value !== null ? euroInput(tile.value) : "");

  // Was beim Speichern rausgeht: Zahl = angepasst, null = Tabellenwert.
  const changes = Object.fromEntries(
    tiles.flatMap((tile) => {
      if (!(tile.key in drafts)) return [];
      const parsed = parseEuroInput(drafts[tile.key]!);
      if (Number.isNaN(parsed)) return [];
      const before = tile.manual ? tile.value : null;
      return parsed === before ? [] : [[tile.key, parsed]];
    }),
  ) as Record<string, number | null>;
  const changedCount = Object.keys(changes).length;
  const invalid = tiles.some((tile) =>
    Number.isNaN(parseEuroInput(valueFor(tile))),
  );

  const save = async () => {
    setSaving(true);
    try {
      await onSave(changes);
      setDrafts({});
      setOpen(false);
      toast.success(
        changedCount === 1 ? "Satz gespeichert." : "Sätze gespeichert.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-ink dark:text-night-text text-lg font-semibold">
            {title}
            {manualCount > 0 && (
              <span className="ml-2 align-middle">
                <Tag tone="inverse">
                  {manualCount === 1
                    ? "1 angepasst"
                    : `${manualCount} angepasst`}
                </Tag>
              </span>
            )}
          </h2>
          {open ? (
            <p className="text-dark dark:text-night-muted mt-1 max-w-3xl text-sm">
              {description}
            </p>
          ) : (
            <p className="text-dark dark:text-night-muted mt-1 text-sm tabular-nums">
              {tiles.map((tile, index) => (
                <span key={tile.key} className="whitespace-nowrap">
                  {index > 0 && <span aria-hidden> · </span>}
                  {tile.label}{" "}
                  <span
                    className={
                      tile.value === null
                        ? "font-semibold text-red-700 dark:text-red-400"
                        : tile.manual
                          ? "text-ink dark:text-night-text font-semibold"
                          : ""
                    }
                  >
                    {tile.value === null
                      ? "fehlt"
                      : `${euroInput(tile.value)} €`}
                  </span>
                </span>
              ))}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          aria-expanded={open}
          onClick={() => {
            if (open) setDrafts({});
            setOpen(!open);
          }}
        >
          {open ? (
            <>
              <X className="h-4 w-4" aria-hidden />
              Schließen
            </>
          ) : (
            <>
              <Settings2 className="h-4 w-4" aria-hidden />
              {editLabel}
            </>
          )}
        </Button>
      </div>

      {open && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tiles.map((tile) => {
              const value = valueFor(tile);
              const parsed = parseEuroInput(value);
              const manual = parsed !== null && !Number.isNaN(parsed);
              const effective = manual ? parsed : tile.sheetValue;
              const missing = effective === null && !Number.isNaN(parsed);
              const inputId = `rate-${tile.key}`;
              return (
                <div
                  key={tile.key}
                  className={`border p-4 transition-colors ${
                    missing
                      ? "border-red-600 dark:border-red-400"
                      : manual
                        ? "border-ink dark:border-night-text"
                        : "border-rule dark:border-night-rule"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <label
                        htmlFor={inputId}
                        className="text-ink dark:text-night-text font-semibold"
                      >
                        {tile.label}
                      </label>
                      {tile.hint && (
                        <p className="text-dark dark:text-night-muted text-xs">
                          {tile.hint}
                        </p>
                      )}
                    </div>
                    <Tag
                      tone={
                        missing ? "cancelled" : manual ? "inverse" : "muted"
                      }
                    >
                      {missing ? "Fehlt" : manual ? "Angepasst" : "Aus Tabelle"}
                    </Tag>
                  </div>

                  <div className="relative mt-3">
                    <Input
                      id={inputId}
                      inputMode="decimal"
                      className="pr-20 text-right tabular-nums"
                      placeholder={
                        tile.sheetValue !== null
                          ? euroInput(tile.sheetValue)
                          : "Betrag eintragen"
                      }
                      value={value}
                      error={Number.isNaN(parsed) || missing}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [tile.key]: event.target.value,
                        }))
                      }
                    />
                    <span className="text-dark dark:text-night-muted pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm">
                      {unit}
                    </span>
                  </div>

                  <div className="text-dark dark:text-night-muted mt-2 flex min-h-6 flex-wrap items-center justify-between gap-x-3 text-sm">
                    <span className="tabular-nums">
                      {Number.isNaN(parsed)
                        ? "Kein gültiger Betrag"
                        : effective === null
                          ? "Die Tabelle kennt keinen Wert"
                          : preview
                            ? preview(effective)
                            : manual && tile.sheetValue !== null
                              ? `Tabelle: ${euroInput(tile.sheetValue)} €`
                              : ""}
                    </span>
                    {manual && tile.sheetValue !== null && (
                      <button
                        type="button"
                        className="hover:text-ink dark:hover:text-night-text underline underline-offset-4"
                        onClick={() =>
                          setDrafts((current) => ({
                            ...current,
                            [tile.key]: "",
                          }))
                        }
                      >
                        Tabellenwert nutzen ({euroInput(tile.sheetValue)} €)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => void save()}
              disabled={changedCount === 0 || invalid}
              isLoading={saving}
            >
              {changedCount > 1
                ? `${changedCount} Sätze speichern`
                : "Sätze speichern"}
            </Button>
            {Object.keys(drafts).length > 0 && (
              <Button variant="ghost" onClick={() => setDrafts({})}>
                Verwerfen
              </Button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
