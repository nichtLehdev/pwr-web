"use client";

import { Tags } from "lucide-react";
import { Select } from "@/app/_components/ui";
import { cn } from "@/lib/utils";
import { FIELD_SELECT_SIZE } from "./field-styles";
import { priceOptionDisplayLabel } from "@/lib/course-price-options";

export type PriceOptionChoice = {
  id: string;
  label: string;
  price: number;
  /** Pflichtfeld: trägt bei gleichnamigen Kategorien die Unterscheidung. */
  description: string | null;
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
  className,
  labelClassName = "text-dark dark:text-dark-text mb-1 block text-sm font-medium",
}: ParticipantPriceOptionFieldProps) {
  if (priceOptions.length === 0) {
    return null;
  }

  const selected = priceOptions.find((option) => option.id === value);

  return (
    <div className={cn("md:col-span-2", className)}>
      <label className={labelClassName}>Preisoption *</label>
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10",
            error
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
            error={error}
            fieldSize={FIELD_SELECT_SIZE}
          >
            {placeholderOption ? <option value="">Bitte wählen</option> : null}
            {priceOptions.map((option) => (
              <option
                key={option.id}
                value={option.id}
                disabled={isOptionDisabled?.(option.id)}
                // Price (and availability) as trailing text, so a long option
                // name truncates on narrow screens without taking the price
                // with it.
                data-trailing={`${option.price.toFixed(2)} €${
                  getOptionSuffix?.(option.id) ?? ""
                }`}
              >
                {priceOptionDisplayLabel(option, priceOptions)}
              </option>
            ))}
          </Select>
          {selected?.description ? (
            <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
              {selected.description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
