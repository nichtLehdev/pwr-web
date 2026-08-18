/**
 * Anzeige-Name einer Preiskategorie.
 *
 * Ein Kurs darf zwei Kategorien mit demselben Namen führen — dieselbe
 * Zimmerart in zwei Häusern etwa, unterschieden nur über die Beschreibung. In
 * einer Auswahlliste stehen sie dann zweimal identisch da und sind für
 * Anmeldende nicht auseinanderzuhalten. In dem Fall wandert die Beschreibung
 * in Klammern hinter den Namen.
 *
 * Nur dann: bei eindeutigem Namen wäre die Klammer bloß Rauschen, und wo die
 * Beschreibung ohnehin als eigene Zeile steht, würde sie doppelt erscheinen.
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
 * Die Preiskategorie eines Teilnehmers.
 *
 * Führend ist `priceOptionId`. Auf das Label wird nur zurückgegriffen, wenn
 * keine id gespeichert ist (Anmeldungen aus der Zeit davor) **und** das Label
 * im Kurs eindeutig ist. Bei Duplikaten lieferte der Label-Treffer sonst die
 * erstbeste Kategorie — und damit den falschen Preis.
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
 * Anzeige-Name der Preiskategorie **eines Teilnehmers** — die Variante für
 * Listen, Detailansichten und Exporte.
 *
 * Löst die Kategorie über {@link resolveParticipantPriceOption} auf und hängt
 * bei doppeltem Namen die Beschreibung an. Lässt sie sich nicht auflösen
 * (gelöschte Kategorie, mehrdeutiger Altbestand), bleibt der gespeicherte
 * Name stehen: er ist das, was zum Zeitpunkt der Anmeldung galt, und
 * verschweigen wäre schlechter als nicht disambiguieren zu können.
 */
export function participantPriceOptionLabel(
  participant: { priceOptionId?: string | null; priceOption?: string | null },
  // `description` ist Pflicht, nicht optional: fehlte sie in der Abfrage,
  // fiele die Disambiguierung stillschweigend aus und die Duplikate stünden
  // wieder identisch nebeneinander.
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
 * Prüft, ob die Preiskategorien eines Kurses auseinanderzuhalten sind.
 *
 * Gleiche Namen sind erlaubt — dieselbe Zimmerart in zwei Häusern etwa —, aber
 * dann muss die Beschreibung sie unterscheiden: sie ist das Einzige, was in
 * Auswahllisten hinter dem Namen erscheint. Ohne sie stehen zwei Einträge
 * identisch nebeneinander und Anmeldende raten, welchen sie nehmen sollen.
 *
 * Gibt die Fehlermeldung zurück oder `null`, wenn alles unterscheidbar ist.
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

/**
 * Ob diese Kategorie eine unterscheidende Beschreibung braucht — für den
 * Hinweis direkt am Eingabefeld, damit der Konflikt beim Tippen auffällt und
 * nicht erst beim Speichern.
 */
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
