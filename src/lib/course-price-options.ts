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
