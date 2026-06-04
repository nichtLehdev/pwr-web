"use client";

import { Tags } from "lucide-react";
import { Select } from "@/app/_components/ui";
import { cn } from "@/lib/utils";

export type PriceOptionChoice = {
  id: string;
  label: string;
  price: number;
  description?: string | null;
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
}: ParticipantPriceOptionFieldProps) {
  if (priceOptions.length === 0) {
    return null;
  }

  const selected = priceOptions.find((option) => option.id === value);

  return (
    <div className={cn("md:col-span-2", className)}>
      <label className="text-dark dark:text-dark-text mb-1 block text-sm font-medium">
        Preisoption *
      </label>
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
          >
            {placeholderOption ? <option value="">Bitte wählen</option> : null}
            {priceOptions.map((option) => (
              <option
                key={option.id}
                value={option.id}
                disabled={isOptionDisabled?.(option.id)}
              >
                {option.label} – {option.price.toFixed(2)} €
                {getOptionSuffix?.(option.id) ?? ""}
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
