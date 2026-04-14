/** Zufällige Tonarten für Fortgeschritten-Modus (Vorzeichen am System). */
export const ADVANCED_RANDOM_KEY_SPECS = [
  "C",
  "G",
  "D",
  "F",
  "Bb",
  "Eb",
  "Ab",
] as const;

export type AdvancedKeySpec = (typeof ADVANCED_RANDOM_KEY_SPECS)[number];

export function randomAdvancedKeySpec(): AdvancedKeySpec {
  const i = Math.floor(Math.random() * ADVANCED_RANDOM_KEY_SPECS.length);
  return ADVANCED_RANDOM_KEY_SPECS[i]!;
}

export type StaffAccidentalLayout =
  | { kind: "explicit" }
  | { kind: "keySignature"; keySpec: AdvancedKeySpec };

export const STAFF_LAYOUT_EXPLICIT: StaffAccidentalLayout = {
  kind: "explicit",
};
