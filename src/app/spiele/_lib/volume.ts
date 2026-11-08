/** Lautstärke aller Spiele, 0 bis 1; gilt fürs Gerät, nicht je Profil, wie der Ton-Schalter. */
const VOLUME_KEY = "pwr.spiele.v1.volume";
export const VOLUME_CHANGED_EVENT = "pwr:spiele-volume";
export const DEFAULT_VOLUME = 0.8;

export function loadVolume(): number {
  try {
    const raw = Number(localStorage.getItem(VOLUME_KEY));
    if (localStorage.getItem(VOLUME_KEY) === null || !Number.isFinite(raw)) {
      return DEFAULT_VOLUME;
    }
    return Math.min(1, Math.max(0, raw));
  } catch {
    return DEFAULT_VOLUME;
  }
}

export function saveVolume(volume: number): void {
  const value = Math.min(1, Math.max(0, volume));
  try {
    localStorage.setItem(VOLUME_KEY, String(value));
  } catch {
    /* Privatmodus: Es gilt nur für diese Sitzung. */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(VOLUME_CHANGED_EVENT, { detail: value }),
    );
  }
}

/** Das Ohr hört Lautstärke logarithmisch: quadriert klingt der Regler gleichmäßig. */
export function gainForVolume(volume: number): number {
  return volume * volume;
}
