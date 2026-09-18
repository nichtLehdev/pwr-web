/**
 * Anzeige-Name einer Preiskategorie. Nur bei doppeltem Namen (z. B. dieselbe Zimmerart in
 * zwei Häusern) folgt die Beschreibung in Klammern.
 */
export function priceOptionDisplayLabel(
  option: { label: string; description: string | null },
  allOptions: ReadonlyArray<{ label: string }>,
): string {
  const description = option.description?.trim();
  if (!description) return option.label;

  const isDuplicated =
    allOptions.filter((other) => other.label === option.label).length > 1;

  return isDuplicated ? `${option.label} (${description})` : option.label;
}

/**
 * Führend ist `priceOptionId`; das Label zählt nur ohne id (Altbestand) und wenn es im
 * Kurs eindeutig ist — sonst träfe es die erstbeste Kategorie und den falschen Preis.
 */
export function resolveParticipantPriceOption<
  TOption extends { id: string; label: string },
>(
  participant: { priceOptionId?: string | null; priceOption?: string | null },
  priceOptions: readonly TOption[] | null | undefined,
): TOption | undefined {
  if (!priceOptions?.length) return undefined;

  if (participant.priceOptionId) {
    return priceOptions.find(
      (option) => option.id === participant.priceOptionId,
    );
  }

  const label = participant.priceOption;
  if (!label) return undefined;

  const matches = priceOptions.filter((option) => option.label === label);
  return matches.length === 1 ? matches[0] : undefined;
}

/**
 * Anzeige-Name der Kategorie eines Teilnehmers. Lässt sie sich nicht auflösen
 * (gelöscht, mehrdeutig), bleibt der bei der Anmeldung gespeicherte Name.
 */
export function participantPriceOptionLabel(
  participant: { priceOptionId?: string | null; priceOption?: string | null },
  // `description` bewusst Pflicht: fehlte sie in der Abfrage, fiele die Unterscheidung still aus.
  priceOptions:
    | readonly { id: string; label: string; description: string | null }[]
    | null
    | undefined,
): string {
  const option = resolveParticipantPriceOption(participant, priceOptions);
  if (!option || !priceOptions) return participant.priceOption ?? "";
  return priceOptionDisplayLabel(option, priceOptions);
}

/**
 * Gleiche Namen sind erlaubt, dann muss die Beschreibung sie unterscheiden.
 * Gibt die Fehlermeldung zurück oder `null`.
 */
export function validatePriceOptionDistinctness(
  options: ReadonlyArray<{ label: string; description?: string | null }>,
): string | null {
  const byLabel = new Map<
    string,
    Array<{ label: string; description?: string | null }>
  >();
  for (const option of options) {
    const label = option.label.trim();
    if (!label) continue;
    byLabel.set(label, [...(byLabel.get(label) ?? []), option]);
  }

  for (const [label, group] of byLabel) {
    if (group.length < 2) continue;

    const descriptions = group.map((o) => o.description?.trim() ?? "");

    if (descriptions.some((d) => !d)) {
      return `Es gibt mehrere Preiskategorien „${label}“. Bitte gib jeder eine Beschreibung, damit Anmeldende sie unterscheiden können — oder benenne sie unterschiedlich.`;
    }

    if (new Set(descriptions).size !== descriptions.length) {
      return `Mehrere Preiskategorien „${label}“ haben dieselbe Beschreibung. Bitte unterscheide sie, damit Anmeldende die richtige auswählen können.`;
    }
  }

  return null;
}

/** Für den Hinweis am Eingabefeld, damit der Konflikt schon beim Tippen auffällt. */
export function needsDistinguishingDescription(
  option: { label: string; description?: string | null },
  allOptions: ReadonlyArray<{ label: string; description?: string | null }>,
): boolean {
  const label = option.label.trim();
  if (!label) return false;

  const sameName = allOptions.filter((other) => other.label.trim() === label);
  if (sameName.length < 2) return false;

  const description = option.description?.trim() ?? "";
  if (!description) return true;

  // Auch eine vorhandene, aber identische Beschreibung unterscheidet nichts.
  return (
    sameName.filter(
      (other) => (other.description?.trim() ?? "") === description,
    ).length > 1
  );
}
