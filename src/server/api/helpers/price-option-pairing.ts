/**
 * Ordnet die eingereichten Preiskategorien den gespeicherten zu.
 *
 * Zwei Durchgänge: erst alles, was eine id mitbringt, dann der Rest über das
 * Label. Der Grund ist, dass Labels **nicht eindeutig** sind — ein Kurs darf
 * zweimal „Erwachsene Einzelzimmer" mit verschiedenen Preisen führen. Ein
 * naives `find()` mit `id-Treffer || Label-Treffer` liefert dann die
 * zuerst einsortierte Zeile und damit den falschen Preis: das Formular meldet
 * eine Preisänderung, obwohl niemand etwas geändert hat.
 *
 * Jede gespeicherte Kategorie wird höchstens einmal vergeben — sonst zeigen
 * zwei Eingaben auf dieselbe Zeile und ein Limit-Update landet am falschen
 * Datensatz.
 */
export function pairPriceOptions<
  TInput extends { id?: string | null; label: string },
  TExisting extends { id: string; label: string },
>(inputs: TInput[], existing: TExisting[]): Map<TInput, TExisting> {
  const pairing = new Map<TInput, TExisting>();
  const unclaimed = [...existing];

  const claim = (input: TInput, index: number) => {
    if (index === -1) return;
    pairing.set(input, unclaimed.splice(index, 1)[0]!);
  };

  for (const input of inputs) {
    if (!input.id) continue;
    claim(
      input,
      unclaimed.findIndex((option) => option.id === input.id),
    );
  }

  for (const input of inputs) {
    if (pairing.has(input)) continue;
    claim(
      input,
      unclaimed.findIndex((option) => option.label === input.label),
    );
  }

  return pairing;
}
