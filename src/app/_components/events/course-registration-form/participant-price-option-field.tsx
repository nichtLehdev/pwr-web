"use client";

import { Tags } from "lucide-react";
import { Select } from "@/app/_components/ui";
import { cn } from "@/lib/utils";
import { FIELD_SELECT_SIZE } from "./field-styles";
import { priceOptionDisplayLabel } from "@/lib/course-price-options";
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
  /**
   * Geburtsdatum des Teilnehmers und der Stichtag (erster Kurstag), an dem die
   * Altersgrenzen gemessen werden. Fehlt eines von beiden, bleiben alle
   * Kategorien wählbar — ohne Geburtsdatum gibt es nichts zu prüfen.
   */
  birthDate?: Date | string | null;
  ageReferenceDate?: Date | string | null;
  /**
   * Nur für das Kursteam: Kategorien außerhalb der Altersgrenze bleiben
   * wählbar, der Hinweis darunter sagt trotzdem, dass die Grenze gerade
   * übergangen wird.
   */
  allowAgeMismatch?: boolean;
  /**
   * Die Kategorie, in der dieser Teilnehmer bereits angemeldet ist: sie bleibt
   * wählbar, auch wenn ihre Altersgrenze inzwischen enger gezogen wurde.
   */
  ageExemptOptionId?: string | null;
  className?: string;
  labelClassName?: string;
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
  labelClassName = "text-dark dark:text-dark-text mb-1 block text-sm font-medium",
}: ParticipantPriceOptionFieldProps) {
  if (priceOptions.length === 0) {
    return null;
  }

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

  // Wählbares nach oben — ausgebucht oder außerhalb der Altersgrenze steht
  // hinten. Bei vielen Kategorien scrollt man sonst an gesperrten Einträgen
  // vorbei, um die zwei zu finden, die überhaupt in Frage kommen. Innerhalb
  // der beiden Gruppen bleibt die Reihenfolge des Kurses erhalten.
  const orderedOptions = [
    ...priceOptions.filter((option) => !isDisabled(option)),
    ...priceOptions.filter(isDisabled),
  ];

  return (
    <div className={cn("md:col-span-2", className)}>
      <label className={labelClassName}>Preisoption *</label>
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10",
            error || ageMismatchIsError
              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
              : "bg-primary/15 text-primary dark:bg-primary/25",
          )}
          aria-hidden
        >
          <Tags className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <Select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            error={error || ageMismatchIsError}
            fieldSize={FIELD_SELECT_SIZE}
          >
            {placeholderOption ? <option value="">Bitte wählen</option> : null}
            {orderedOptions.map((option) => {
              const ageRange = priceOptionAgeLabel(option);
              return (
                <option
                  key={option.id}
                  value={option.id}
                  disabled={isDisabled(option)}
                  // Price (and availability) as trailing text, so a long option
                  // name truncates on narrow screens without taking the price
                  // with it.
                  data-trailing={`${option.price.toFixed(2)} €${
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
              role="alert"
              className={cn(
                "mt-1.5 text-sm",
                ageMismatchIsError
                  ? "text-red-700 dark:text-red-400"
                  : "text-amber-700 dark:text-amber-400",
              )}
            >
              {ageMismatch}
              {allowAgeMismatch
                ? " Als Kursteam darfst du das so eintragen."
                : ""}
            </p>
          ) : noOptionForAge ? (
            <p
              role="alert"
              className="mt-1.5 text-sm text-red-700 dark:text-red-400"
            >
              Zu Kursbeginn sind es {age} Jahre. Dafür gibt es in diesem Kurs
              keine passende Preiskategorie — bitte wende dich an das Kursteam.
            </p>
          ) : selected?.description ? (
            <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
              {selected.description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
