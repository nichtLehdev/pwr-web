/**
 * Ordnet eingereichte Preiskategorien den gespeicherten zu: erst per id, dann per Label,
 * weil Labels nicht eindeutig sind. Jede gespeicherte Kategorie wird höchstens einmal vergeben.
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
