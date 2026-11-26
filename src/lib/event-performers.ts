import { z } from "zod";

/**
 * Mitwirkende eines Termins. Ein Termin kann mehrere haben, z. B. zwei
 * Posaunenchöre zusammen oder einen Auswahlchor mit einem Ensemble.
 * Gespeichert in `EventPerformer`; hier steht die db-freie Logik dazu.
 */

export const PERFORMER_TYPES = ["AUSWAHLCHOR", "ENSEMBLE", "CUSTOM"] as const;
export type PerformerType = (typeof PERFORMER_TYPES)[number];

export const PERFORMER_TYPE_LABELS: Record<PerformerType, string> = {
  AUSWAHLCHOR: "Auswahlchor",
  ENSEMBLE: "Posaunenchor / Ensemble",
  CUSTOM: "Freier Name",
};

export const MAX_PERFORMERS = 10;
export const MAX_PERFORMER_NAME_LENGTH = 200;

export const performerInputSchema = z.object({
  type: z.enum(PERFORMER_TYPES),
  ensembleId: z.string().nullish(),
  auswahlChorId: z.string().nullish(),
  /** Nur bei CUSTOM maßgeblich; bei verknüpften Zeilen setzt der Server den Namen. */
  name: z.string().max(MAX_PERFORMER_NAME_LENGTH).nullish(),
});

export const performersInputSchema = z
  .array(performerInputSchema)
  .max(MAX_PERFORMERS);

export type PerformerInput = z.infer<typeof performerInputSchema>;

/** Eine bereinigte Zeile: genau das zum Typ passende Ziel ist gesetzt. */
export type NormalizedPerformer =
  | { type: "ENSEMBLE"; ensembleId: string }
  | { type: "AUSWAHLCHOR"; auswahlChorId: string }
  | { type: "CUSTOM"; name: string };

/**
 * Wirft leere Zeilen weg (kein Ziel, kein Name), entfernt doppelte
 * Verknüpfungen und Namen und behält die Reihenfolge bei.
 */
export function normalizePerformers(
  inputs: readonly PerformerInput[],
): NormalizedPerformer[] {
  const seen = new Set<string>();
  const result: NormalizedPerformer[] = [];

  for (const input of inputs) {
    let row: NormalizedPerformer | null = null;
    let key = "";

    if (input.type === "ENSEMBLE" && input.ensembleId) {
      row = { type: "ENSEMBLE", ensembleId: input.ensembleId };
      key = `e:${input.ensembleId}`;
    } else if (input.type === "AUSWAHLCHOR" && input.auswahlChorId) {
      row = { type: "AUSWAHLCHOR", auswahlChorId: input.auswahlChorId };
      key = `a:${input.auswahlChorId}`;
    } else if (input.type === "CUSTOM") {
      const name = input.name?.trim();
      if (name) {
        row = { type: "CUSTOM", name };
        key = `c:${name.toLocaleLowerCase("de")}`;
      }
    }

    if (row && !seen.has(key)) {
      seen.add(key);
      result.push(row);
    }
  }

  return result;
}

/** Verknüpfte Ensemble-IDs einer Liste, ohne Dubletten. */
export function linkedEnsembleIds(
  performers: readonly { ensembleId?: string | null }[],
): string[] {
  return [
    ...new Set(
      performers
        .map((p) => p.ensembleId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
}

/** Was die Lese-Abfragen pro Zeile mitliefern (Name des Ziels darf fehlen). */
export type PerformerLike = {
  name: string;
  ensemble?: { name: string } | null;
  auswahlChor?: { name: string } | null;
};

/** Aktueller Name des Ziels, sonst der beim Speichern gemerkte. */
export function performerName(performer: PerformerLike): string {
  return (
    performer.ensemble?.name ??
    performer.auswahlChor?.name ??
    performer.name
  ).trim();
}

/** „A“, „A & B“, „A, B und C“. */
export function joinPerformerNames(names: readonly string[]): string {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length <= 1) return clean[0] ?? "";
  if (clean.length === 2) return `${clean[0]} & ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")} und ${clean[clean.length - 1]}`;
}

/** Alle Mitwirkenden eines Termins als eine Zeile; leer, wenn keine. */
export function performerNames(
  performers: readonly PerformerLike[] | null | undefined,
): string {
  return joinPerformerNames((performers ?? []).map(performerName));
}

/** Bild des ersten verknüpften Mitwirkenden, als Ersatz für ein fehlendes Titelbild. */
export function firstPerformerImage<
  TImage extends { url: string; alt?: string | null },
>(
  performers:
    | readonly {
        ensemble?: { image?: TImage | null } | null;
        auswahlChor?: { image?: TImage | null } | null;
      }[]
    | null
    | undefined,
): TImage | null {
  for (const p of performers ?? []) {
    const image = p.ensemble?.image ?? p.auswahlChor?.image;
    if (image) return image;
  }
  return null;
}
