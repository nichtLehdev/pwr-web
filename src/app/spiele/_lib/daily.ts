import { scopedKey } from "./profiles/scope";

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function key(game: string): string {
  return scopedKey(`pwr.spiele.v1.${game}.daily`);
}

export function isDailyDone(game: string): boolean {
  try {
    return localStorage.getItem(key(game)) === today();
  } catch {
    return false;
  }
}

export function markDailyDone(game: string): void {
  try {
    localStorage.setItem(key(game), today());
  } catch {
    /* Ohne Speicher zeigt die Kachel nur keinen Haken. */
  }
}

/** Verfehlte Töne über Tage merken, damit das Tagestraining sie öfter bringt. */
export function loadWeak(name: string): Map<string, number> {
  try {
    const raw = JSON.parse(
      localStorage.getItem(scopedKey(`pwr.spiele.v1.${name}.weak`)) ?? "{}",
    ) as Record<string, unknown>;
    return new Map(
      Object.entries(raw).filter(
        (entry): entry is [string, number] => typeof entry[1] === "number",
      ),
    );
  } catch {
    return new Map();
  }
}

export function saveWeak(
  name: string,
  weak: ReadonlyMap<string, number>,
): void {
  try {
    localStorage.setItem(
      scopedKey(`pwr.spiele.v1.${name}.weak`),
      JSON.stringify(Object.fromEntries(weak)),
    );
  } catch {
    /* siehe oben */
  }
}
