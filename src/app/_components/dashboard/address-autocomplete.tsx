"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

/**
 * Adressuche mit Vorschlägen während der Eingabe (Photon/OpenStreetMap).
 * Füllt Name, Straße, PLZ, Stadt und Koordinaten in einem Rutsch — die
 * Koordinaten sparen beim Speichern den Geocoding-Aufruf.
 */

export type AddressSuggestion = {
  name: string | null;
  street: string | null;
  zipCode: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
};

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 350;

const defaultInputClass =
  "focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white py-2 pr-9 pl-9 text-gray-900 focus:ring-1 focus:outline-none";

/** Verzögert den Wert, damit nicht jeder Tastendruck eine Anfrage auslöst. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}

export function AddressAutocomplete({
  onSelect,
  label = "Adresse suchen",
  placeholder = "z.B. Gemeindehaus Köln-Deutz oder Musterstraße 1, Köln",
  hint = "Vorschlag auswählen, um die Felder unten automatisch zu füllen",
  inputClassName,
  className,
}: {
  onSelect: (suggestion: AddressSuggestion) => void;
  /** `null` blendet das Label aus (z.B. in kompakten Formularen). */
  label?: string | null;
  placeholder?: string;
  hint?: string | null;
  inputClassName?: string;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const trimmedQuery = debouncedQuery.trim();
  const isSearchable = trimmedQuery.length >= MIN_QUERY_LENGTH;

  const { data: suggestions, isFetching } =
    api.locations.searchAddress.useQuery(
      { query: trimmedQuery },
      {
        enabled: isSearchable,
        staleTime: 5 * 60 * 1000,
        // Alte Treffer stehen lassen, damit die Liste beim Tippen nicht flackert.
        placeholderData: (previous) => previous,
      },
    );

  const results = isSearchable ? (suggestions ?? []) : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (suggestion: AddressSuggestion) => {
    onSelect(suggestion);
    setQuery("");
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (event.key === "Enter") {
      // Die Suche liegt innerhalb des Seitenformulars — Enter darf dieses
      // niemals abschicken, sondern höchstens einen Vorschlag übernehmen.
      event.preventDefault();
      const active = results[activeIndex];
      if (isOpen && active) {
        handleSelect(active);
      }
      return;
    }

    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }

    event.preventDefault();
    if (results.length === 0) {
      return;
    }
    setIsOpen(true);
    setActiveIndex((current) => {
      const next = event.key === "ArrowDown" ? current + 1 : current - 1;
      if (next < 0) return results.length - 1;
      if (next >= results.length) return 0;
      return next;
    });
  };

  const showDropdown = isOpen && isSearchable;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {label ? (
        <label
          htmlFor={listboxId + "-input"}
          className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      ) : null}

      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
          aria-hidden
        />
        <input
          id={listboxId + "-input"}
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
            // Markierung nicht über eine neue Trefferliste hinweg mitnehmen.
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={inputClassName ?? defaultInputClass}
        />
        {isFetching && isSearchable ? (
          <Loader2
            className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400"
            aria-hidden
          />
        ) : null}
      </div>

      {hint ? (
        <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
          {hint}
        </p>
      ) : null}

      {showDropdown ? (
        <div
          id={listboxId}
          role="listbox"
          className="dark:border-dark-border dark:bg-dark-surface absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {results.length > 0 ? (
            results.map((suggestion, index) => (
              <button
                key={`${suggestion.latitude},${suggestion.longitude},${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => handleSelect(suggestion)}
                className={cn(
                  "flex w-full items-start gap-2 px-3 py-2 text-left text-sm",
                  index === activeIndex
                    ? "bg-gray-100 dark:bg-gray-700"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700",
                )}
              >
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="dark:text-dark-text block font-medium text-gray-900">
                    {suggestion.name ?? suggestion.street ?? suggestion.city}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {[
                      suggestion.name ? suggestion.street : null,
                      [suggestion.zipCode, suggestion.city]
                        .filter(Boolean)
                        .join(" "),
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              {isFetching ? "Suche läuft …" : "Keine Adresse gefunden"}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
