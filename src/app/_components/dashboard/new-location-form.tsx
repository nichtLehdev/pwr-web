"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/app/_components/ui/toast";
import { getErrorMessage } from "@/lib/utils";
import {
  AddressAutocomplete,
  type AddressSuggestion,
} from "./address-autocomplete";

/**
 * Kompaktes "Neuen Ort erstellen"-Formular, das in Kurs-, Termin- und
 * Ensemble-Formularen eingeblendet wird. Enthält Zustand und Mutation, damit
 * die einbettenden Seiten nur noch auf das Ergebnis reagieren müssen.
 */

export type CreatedLocation = {
  id: string;
  name: string | null;
  city: string;
};

type LocationDraft = {
  name: string;
  street: string;
  zipCode: string;
  city: string;
  country: string;
  additionalInfo: string;
  latitude?: number;
  longitude?: number;
};

export const DEFAULT_LOCATION_COUNTRY = "Deutschland";

const emptyDraft = (): LocationDraft => ({
  name: "",
  street: "",
  zipCode: "",
  city: "",
  country: DEFAULT_LOCATION_COUNTRY,
  additionalInfo: "",
});

const inputClass =
  "border-ink dark:border-night-text dark:bg-night dark:text-night-text block w-full border bg-paper px-3 py-2 text-sm";

export function NewLocationForm({
  onCreated,
  onCancel,
  onError,
  title = "Neuen Ort erstellen",
  successMessage = "Standort erstellt",
}: {
  onCreated: (location: CreatedLocation) => void;
  onCancel: () => void;
  /** Fehler zusätzlich im Formular der Seite anzeigen. */
  onError?: (message: string) => void;
  title?: string;
  successMessage?: string;
}) {
  const [draft, setDraft] = useState<LocationDraft>(emptyDraft);
  const [validationError, setValidationError] = useState("");
  const toast = useToast();
  const utils = api.useUtils();

  const createMutation = api.locations.create.useMutation({
    onSuccess: async (location) => {
      // Damit der neue Ort sofort in der Ortssuche auftaucht.
      await utils.locations.getAll.invalidate();
      setDraft(emptyDraft());
      setValidationError("");
      toast.success(successMessage);
      onCreated(location);
    },
    onError: (err) => {
      const message = getErrorMessage(
        err,
        "Fehler beim Erstellen des Standortes.",
      );
      setValidationError(message);
      onError?.(message);
      toast.error(message);
    },
  });

  const patch = (changes: Partial<LocationDraft>) =>
    setDraft((current) => ({ ...current, ...changes }));

  const applySuggestion = (suggestion: AddressSuggestion) => {
    setValidationError("");
    setDraft((current) => ({
      ...current,
      // Bereits Getipptes nur ersetzen, wenn der Vorschlag etwas liefert.
      name: suggestion.name ?? current.name,
      street: suggestion.street ?? current.street,
      zipCode: suggestion.zipCode ?? current.zipCode,
      city: suggestion.city ?? current.city,
      country: suggestion.country ?? current.country,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    }));
  };

  const handleSubmit = () => {
    if (!draft.city.trim()) {
      const message = "Bitte gib mindestens eine Stadt an.";
      setValidationError(message);
      onError?.(message);
      return;
    }

    createMutation.mutate({
      name: draft.name.trim() || undefined,
      street: draft.street.trim() || undefined,
      zipCode: draft.zipCode.trim() || undefined,
      city: draft.city.trim(),
      country: draft.country.trim() || DEFAULT_LOCATION_COUNTRY,
      additionalInfo: draft.additionalInfo.trim() || undefined,
      latitude: draft.latitude,
      longitude: draft.longitude,
    });
  };

  return (
    <div className="border-rule dark:border-night-rule dark:bg-night-raised bg-rule/25 border p-4">
      <h3 className="text-ink dark:text-night-text mb-3 font-medium">
        {title}
      </h3>

      <AddressAutocomplete
        onSelect={applySuggestion}
        label={null}
        hint={null}
        className="mb-3"
        inputClassName="border-ink dark:border-night-text dark:bg-night dark:text-night-text block w-full border bg-paper py-2 pr-9 pl-9 text-sm"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <input
            type="text"
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Name (z.B. Gemeindehaus)"
            autoComplete="organization"
            maxLength={200}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <input
            type="text"
            value={draft.street}
            onChange={(e) => patch({ street: e.target.value })}
            placeholder="Straße und Hausnummer"
            autoComplete="street-address"
            maxLength={200}
            className={inputClass}
          />
        </div>
        <div>
          <input
            type="text"
            value={draft.zipCode}
            onChange={(e) => patch({ zipCode: e.target.value })}
            placeholder="PLZ"
            autoComplete="postal-code"
            maxLength={20}
            className={inputClass}
          />
        </div>
        <div>
          <input
            type="text"
            value={draft.city}
            onChange={(e) => patch({ city: e.target.value })}
            placeholder="Stadt *"
            autoComplete="address-level2"
            maxLength={100}
            required
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <input
            type="text"
            value={draft.country}
            onChange={(e) => patch({ country: e.target.value })}
            placeholder="Land"
            autoComplete="country-name"
            maxLength={100}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <input
            type="text"
            value={draft.additionalInfo}
            onChange={(e) => patch({ additionalInfo: e.target.value })}
            placeholder="Zusätzliche Info (z.B. Eingang über Hinterhof)"
            maxLength={500}
            className={inputClass}
          />
        </div>
      </div>

      {validationError ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {validationError}
        </p>
      ) : null}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={createMutation.isPending}
          className="bg-primary hover:bg-primary/90 text-ink min-h-11 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {createMutation.isPending ? "Speichern..." : "Speichern"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border-ink dark:border-night-text dark:text-night-text text-ink hover:bg-rule/30 dark:hover:bg-night-raised min-h-11 border px-3 py-1.5 text-sm font-medium"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
