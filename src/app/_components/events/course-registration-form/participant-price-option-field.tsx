"use client";

import { useId } from "react";
import { Tags } from "lucide-react";
import { Select } from "@/app/_components/ui";
import { cn } from "@/lib/utils";
import { FIELD_SELECT_SIZE } from "./field-styles";
import { priceOptionDisplayLabel } from "@/lib/course-price-options";
import { formatEuro } from "@/lib/invoice-document";
import {
  ageOnDate,
  isAgeWithinPriceOption,
  priceOptionAgeLabel,
  priceOptionAgeMismatchMessage,
} from "@/lib/course-price-option-age";

export type PriceOptionChoice = {
  id: string;
  label: string;
  price: number;
  /** Pflichtfeld: trägt bei gleichnamigen Kategorien die Unterscheidung. */
  description: string | null;
  /** Altersgrenzen in vollendeten Jahren am ersten Kurstag, je optional. */
  minAge?: number | null;
  maxAge?: number | null;
};

type ParticipantPriceOptionFieldProps = {
  priceOptions: PriceOptionChoice[];
  value: string;
  onChange: (priceOptionId: string) => void;
  error?: boolean;
  /** Show empty “Bitte wählen” option (e.g. edit registration). */
  placeholderOption?: boolean;
  isOptionDisabled?: (optionId: string) => boolean;
  getOptionSuffix?: (optionId: string) => string;
  /** Mit dem Stichtag (erster Kurstag) für die Altersgrenzen; fehlt eines, bleibt alles wählbar. */
  birthDate?: Date | string | null;
  ageReferenceDate?: Date | string | null;
  /** Nur Kursteam: Kategorien außerhalb der Altersgrenze bleiben wählbar, mit Hinweis. */
  allowAgeMismatch?: boolean;
  /** Bereits gebuchte Kategorie bleibt wählbar, auch wenn ihre Altersgrenze enger gezogen wurde. */
  ageExemptOptionId?: string | null;
  className?: string;
  labelClassName?: string;
  /** Sammelmeldung außerhalb des Felds, per `aria-describedby` verknüpft. */
  errorDescriptionId?: string;
};

export function ParticipantPriceOptionField({
  priceOptions,
  value,
  onChange,
  error = false,
  placeholderOption = false,
  isOptionDisabled,
  getOptionSuffix,
  birthDate,
  ageReferenceDate,
  allowAgeMismatch = false,
  ageExemptOptionId,
  className,
  labelClassName = "text-ink dark:text-night-text mb-1 block text-sm font-semibold",
  errorDescriptionId,
}: ParticipantPriceOptionFieldProps) {
  const uid = useId();
  if (priceOptions.length === 0) {
    return null;
  }
  const selectId = `${uid}-preisoption`;
  const noteId = `${uid}-hinweis`;

  const selected = priceOptions.find((option) => option.id === value);
  const age = ageReferenceDate ? ageOnDate(birthDate, ageReferenceDate) : null;

  const ageFits = (option: PriceOptionChoice) =>
    option.id === ageExemptOptionId || isAgeWithinPriceOption(option, age);

  const ageMismatch =
    selected && !ageFits(selected)
      ? priceOptionAgeMismatchMessage(selected, age)
      : null;
  // Für das Kursteam ist die überschrittene Grenze ein Hinweis, kein Fehler:
  // es darf sie setzen, soll sie aber sehen.
  const ageMismatchIsError = !!ageMismatch && !allowAgeMismatch;

  // Ein Teilnehmer, für den keine einzige Kategorie in Frage kommt, würde
  // sonst nur auf eine Liste lauter gesperrter Einträge schauen.
  const noOptionForAge =
    age !== null && !allowAgeMismatch && !priceOptions.some(ageFits);

  const isDisabled = (option: PriceOptionChoice) =>
    (isOptionDisabled?.(option.id) ?? false) ||
    (!allowAgeMismatch && !ageFits(option));

  // Wählbares nach oben, Gesperrtes nach hinten; innerhalb beider Gruppen bleibt
  // die Reihenfolge des Kurses.
  const orderedOptions = [
    ...priceOptions.filter((option) => !isDisabled(option)),
    ...priceOptions.filter(isDisabled),
  ];

  return (
    <div className={cn("md:col-span-2", className)}>
      {/* `htmlFor` auf den Auslöser, sonst hat die Liste keinen Namen (axe: button-name). */}
      <label htmlFor={selectId} className={labelClassName}>
        Preisoption<span aria-hidden> *</span>
      </label>
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center sm:h-10 sm:w-10",
            error || ageMismatchIsError
              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
              : "bg-rule dark:bg-night-rule text-ink dark:text-night-text",
          )}
          aria-hidden
        >
          <Tags className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <Select
            id={selectId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required
            aria-invalid={error || ageMismatchIsError || undefined}
            aria-describedby={
              [
                ageMismatch || noOptionForAge || selected?.description
                  ? noteId
                  : null,
                error ? errorDescriptionId : null,
              ]
                .filter(Boolean)
                .join(" ") || undefined
            }
            error={error || ageMismatchIsError}
            fieldSize={FIELD_SELECT_SIZE}
            className="border-ink! dark:border-night-text! text-ink! dark:text-night-text! bg-paper! dark:bg-night! rounded-none!"
          >
            {placeholderOption ? <option value="">Bitte wählen</option> : null}
            {orderedOptions.map((option) => {
              const ageRange = priceOptionAgeLabel(option);
              return (
                <option
                  key={option.id}
                  value={option.id}
                  disabled={isDisabled(option)}
                  // Trailing text, so a long name truncates without taking the price with it.
                  data-trailing={`${formatEuro(option.price)}${
                    getOptionSuffix?.(option.id) ?? ""
                  }`}
                >
                  {priceOptionDisplayLabel(option, priceOptions)}
                  {ageRange ? ` · ${ageRange}` : ""}
                </option>
              );
            })}
          </Select>
          {ageMismatch ? (
            <p
              id={noteId}
              role="alert"
              className={cn(
                "mt-1.5 text-sm",
                ageMismatchIsError
                  ? "text-red-700 dark:text-red-400"
                  : "text-primary-ink dark:text-primary",
              )}
            >
              {ageMismatch}
              {allowAgeMismatch
                ? " Als Kursteam darfst du das so eintragen."
                : ""}
            </p>
          ) : noOptionForAge ? (
            <p
              id={noteId}
              role="alert"
              className="mt-1.5 text-sm text-red-700 dark:text-red-400"
            >
              Für ein Alter von {age} Jahren zu Kursbeginn gibt es in diesem
              Kurs keine passende Preiskategorie. Bitte wende dich an das
              Kursteam.
            </p>
          ) : selected?.description ? (
            <p
              id={noteId}
              className="text-dark dark:text-night-muted mt-1.5 text-sm"
            >
              {selected.description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
