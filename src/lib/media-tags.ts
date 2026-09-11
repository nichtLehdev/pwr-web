/**
 * `Media.tags` ist eine JSON-Spalte, in der historisch zweierlei gelandet ist:
 * Arrays aus dem Import und — über ein `z.string()` im Router — einzelne
 * Komma-Strings aus dem Dashboard. Beide Formen müssen weiter lesbar bleiben,
 * geschrieben wird ab jetzt ausschließlich ein Array.
 */
export function parseMediaTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") return splitMediaTags(value);
  return [];
}

/** Komma-getrennte Eingabe aus dem Formular in einzelne Tags zerlegen. */
export function splitMediaTags(input: string): string[] {
  return input
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Tags für das Formularfeld wieder zu einer Zeile zusammenfassen. */
export function formatMediaTags(value: unknown): string {
  return parseMediaTags(value).join(", ");
}
