/**
 * Fortschritt zweier Geräte zusammenführen: Zahlen nach Maximum, Wahrheitswerte
 * nach Oder. So überschreibt ein Gerät nie, was ein anderes schon geschafft hat.
 */
export type ProgressValue =
  | number
  | boolean
  | string
  | null
  | ProgressValue[]
  | { [key: string]: ProgressValue };

function isObject(value: unknown): value is Record<string, ProgressValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mergeProgress(
  stored: ProgressValue | undefined,
  incoming: ProgressValue | undefined,
): ProgressValue {
  if (stored === undefined) return incoming ?? null;
  if (incoming === undefined) return stored;
  if (typeof stored === "number" && typeof incoming === "number") {
    return Math.max(stored, incoming);
  }
  if (typeof stored === "boolean" && typeof incoming === "boolean") {
    return stored || incoming;
  }
  if (isObject(stored) && isObject(incoming)) {
    const out: Record<string, ProgressValue> = { ...stored };
    for (const [key, value] of Object.entries(incoming)) {
      out[key] = mergeProgress(stored[key], value);
    }
    return out;
  }
  // Unterschiedliche Formen: Das Neuere zählt, sonst blockiert ein alter Stand ewig.
  return incoming;
}
