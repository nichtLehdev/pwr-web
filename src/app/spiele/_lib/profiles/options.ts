import type { GriffeInstrumentId } from "../../(spiel)/griffe/_lib/types";
import type { InstrumentId } from "../../(spiel)/noten-lesen/_lib/types";

/** Instrumente eines Posaunenchors; ein Profil darf mehrere spielen. */
export const PROFILE_INSTRUMENTS = [
  {
    id: "trompete",
    label: "Trompete oder Flügelhorn",
    noten: "trumpet_c",
    griffe: "trumpet_c",
  },
  { id: "horn", label: "Horn", noten: "horn_f", griffe: null },
  { id: "posaune", label: "Posaune", noten: "trombone", griffe: "trombone" },
  {
    id: "tenorhorn",
    label: "Tenorhorn, Bariton oder Euphonium",
    noten: "trombone",
    griffe: null,
  },
  { id: "tuba", label: "Tuba", noten: "tuba", griffe: null },
] as const satisfies readonly {
  id: string;
  label: string;
  noten: InstrumentId;
  griffe: GriffeInstrumentId | null;
}[];

export type ProfileInstrument = (typeof PROFILE_INSTRUMENTS)[number]["id"];
export const PROFILE_INSTRUMENT_IDS = PROFILE_INSTRUMENTS.map((i) => i.id) as [
  ProfileInstrument,
  ...ProfileInstrument[],
];

/** Tonis Farbe als Erkennungszeichen; der Rest der Spielwelt bleibt Messing. */
export const PROFILE_COLORS = {
  messing: { body: "#faa619", dark: "#e08a00", label: "Messing" },
  rot: { body: "#f2735f", dark: "#c94a3a", label: "Rot" },
  blau: { body: "#62a3f5", dark: "#3a72c9", label: "Blau" },
  gruen: { body: "#72c771", dark: "#3f9a3e", label: "Grün" },
  lila: { body: "#ad86f2", dark: "#7b52c8", label: "Lila" },
  tuerkis: { body: "#45c9c4", dark: "#25918e", label: "Türkis" },
} as const;

export type ProfileColor = keyof typeof PROFILE_COLORS;
export const PROFILE_COLOR_IDS = Object.keys(PROFILE_COLORS) as [
  ProfileColor,
  ...ProfileColor[],
];

export function isProfileColor(value: string): value is ProfileColor {
  return Object.hasOwn(PROFILE_COLORS, value);
}

export const MAX_PROFILES = 6;

/** Instrumente des Profils in der Sprache eines Spiels, ohne Doppelte. */
export function gameInstruments<K extends "noten" | "griffe">(
  instruments: readonly string[],
  game: K,
): NonNullable<(typeof PROFILE_INSTRUMENTS)[number][K]>[] {
  const out = new Set<NonNullable<(typeof PROFILE_INSTRUMENTS)[number][K]>>();
  for (const id of instruments) {
    const value = PROFILE_INSTRUMENTS.find((i) => i.id === id)?.[game];
    if (value)
      out.add(value as NonNullable<(typeof PROFILE_INSTRUMENTS)[number][K]>);
  }
  return [...out];
}
