/**
 * Lokaler Speicher je Profil: Fortschritt liegt unter `pwr.spiele.v1.p.<id>.…`,
 * Geräte-Einstellungen wie Ton und Latenz bleiben für alle gleich.
 */
const PREFIX = "pwr.spiele.v1.";
const ADOPTED_KEY = `${PREFIX}profiles.adopted`;
export const PROGRESS_CHANGED_EVENT = "pwr:spiele-progress-changed";

type ActiveProfile = { id: string; instruments: readonly string[] } | null;
let active: ActiveProfile = null;

/** Setzt die Profil-Hülle, bevor ein Spiel seinen Speicher liest. */
export function setActiveProfileScope(profile: ActiveProfile): void {
  active = profile;
}

export function activeProfileId(): string | null {
  return active?.id ?? null;
}

export function activeProfileInstruments(): readonly string[] {
  return active?.instruments ?? [];
}

export function scopedKey(base: string): string {
  if (!active || !base.startsWith(PREFIX)) return base;
  return `${PREFIX}p.${active.id}.${base.slice(PREFIX.length)}`;
}

/** Was zum Fortschritt gehört und deshalb mit dem Server abgeglichen wird. */
export function isProgressSuffix(suffix: string): boolean {
  return (
    suffix.endsWith(".path") ||
    suffix === "rhythmus.progress" ||
    suffix === "rhythmus.endless"
  );
}

const SCOPED_SUFFIXES = (suffix: string) =>
  isProgressSuffix(suffix) ||
  suffix === "rhythmus.prefs" ||
  suffix === "tutorials" ||
  /^(rhythmus|diktat|noten-lesen|griffe|notenwaage)$/.test(suffix);

export function notifyProgressChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PROGRESS_CHANGED_EVENT));
  }
}

/** Das erste Profil eines Geräts übernimmt, was dort schon gespielt wurde. */
export function adoptLocalProgress(profileId: string): void {
  try {
    if (localStorage.getItem(ADOPTED_KEY)) return;
    const target = `${PREFIX}p.${profileId}.`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX) || key.startsWith(`${PREFIX}p.`)) continue;
      const suffix = key.slice(PREFIX.length);
      if (!SCOPED_SUFFIXES(suffix)) continue;
      const value = localStorage.getItem(key);
      if (value !== null && localStorage.getItem(target + suffix) === null) {
        localStorage.setItem(target + suffix, value);
      }
    }
    localStorage.setItem(ADOPTED_KEY, profileId);
  } catch {
    /* Ohne Speicher gibt es nichts zu übernehmen. */
  }
}

/** Fortschritt eines Profils für den Server, Pfad-Auswahl bleibt auf dem Gerät. */
export function collectProgress(profileId: string): Record<string, unknown> {
  const prefix = `${PREFIX}p.${profileId}.`;
  const out: Record<string, unknown> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      const suffix = key.slice(prefix.length);
      if (!isProgressSuffix(suffix)) continue;
      const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
      out[suffix] = suffix.endsWith(".path")
        ? ((parsed as { progress?: unknown } | null)?.progress ?? {})
        : parsed;
    }
  } catch {
    /* Kaputte Einträge überspringen. */
  }
  return out;
}

export function applyProgress(
  profileId: string,
  progress: Record<string, unknown>,
): void {
  const prefix = `${PREFIX}p.${profileId}.`;
  try {
    for (const [suffix, value] of Object.entries(progress)) {
      if (!isProgressSuffix(suffix)) continue;
      const key = prefix + suffix;
      if (suffix.endsWith(".path")) {
        const stored = JSON.parse(localStorage.getItem(key) ?? "null") as {
          selectedId?: string;
        } | null;
        localStorage.setItem(
          key,
          JSON.stringify({ selectedId: stored?.selectedId, progress: value }),
        );
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    }
  } catch {
    /* Speicher voll: Der Server behält den Stand. */
  }
}
