"use client";

import {
  MAX_PRICE_OPTION_AGE,
  MIN_PRICE_OPTION_AGE,
  priceOptionAgeLabel,
  validatePriceOptionAgeRange,
} from "@/lib/course-price-option-age";

export interface PriceOptionAgeDraft {
  minAge?: number | null;
  maxAge?: number | null;
}

interface PriceOptionAgeLimitsProps {
  option: PriceOptionAgeDraft & { label?: string };
  onChange: (field: "minAge" | "maxAge", value: number | undefined) => void;
  /** The page's own input styling, so the two fields match their neighbours. */
  inputClassName: string;
  labelClassName?: string;
  /** Locked once the course has its first booking, like label and price. */
  disabled?: boolean;
}

const parseAge = (raw: string): number | undefined => {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const value = Number.parseInt(trimmed, 10);
  return Number.isNaN(value) ? undefined : value;
};

/**
 * Mindest- und Höchstalter einer Preiskategorie.
 *
 * Beide Felder sind optional und einzeln nutzbar: „Kinder & Jugendliche“
 * braucht meist nur ein Höchstalter, „Erwachsene“ nur ein Mindestalter. Wo die
 * Grenze liegt, entscheidet der Kurs — im einen Haus ist man mit 18 erwachsen,
 * im anderen zählt man bis 26 zur Jugend.
 *
 * Ab der ersten Anmeldung gesperrt, genau wie Bezeichnung und Preis: die
 * Grenzen entscheiden, wer welchen Preis zahlt, und nachträglich verschoben
 * stünden Angemeldete in einer Kategorie, die ihnen nicht mehr zusteht.
 */
export function PriceOptionAgeLimits({
  option,
  onChange,
  inputClassName,
  labelClassName = "mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400",
  disabled = false,
}: PriceOptionAgeLimitsProps) {
  const problem = validatePriceOptionAgeRange(option);
  const summary = priceOptionAgeLabel(option);

  const field = (key: "minAge" | "maxAge", label: string) => (
    <div>
      <label className={labelClassName}>{label}</label>
      <input
        type="number"
        value={option[key] ?? ""}
        onChange={(e) => onChange(key, parseAge(e.target.value))}
        min={MIN_PRICE_OPTION_AGE}
        max={MAX_PRICE_OPTION_AGE}
        step={1}
        disabled={disabled}
        placeholder="Keine Grenze"
        className={inputClassName}
      />
    </div>
  );

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {field("minAge", "Mindestalter (optional)")}
        {field("maxAge", "Höchstalter (optional)")}
      </div>

      {problem ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{problem}</p>
      ) : summary ? (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Wählbar für {summary} — gerechnet auf den ersten Kurstag.
        </p>
      ) : (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Ohne Grenzen steht die Kategorie jedem Alter offen.
        </p>
      )}
    </div>
  );
}
