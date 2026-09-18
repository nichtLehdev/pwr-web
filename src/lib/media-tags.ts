/**
 * `Media.tags` enthält Arrays (Import) oder Komma-Strings (altes Dashboard). Beide
 * bleiben lesbar; geschrieben wird nur ein Array.
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

export function splitMediaTags(input: string): string[] {
  return input
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function formatMediaTags(value: unknown): string {
  return parseMediaTags(value).join(", ");
}
