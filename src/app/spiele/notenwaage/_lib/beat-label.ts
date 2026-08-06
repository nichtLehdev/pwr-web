import { QUARTER_UNITS } from "./types";

// Unicode-Brüche, wo es sie gibt — sonst „x/y“-Fallback.
const VULGAR: Record<string, string> = {
  "1/2": "½",
  "1/3": "⅓",
  "2/3": "⅔",
  "1/4": "¼",
  "3/4": "¾",
  "1/6": "⅙",
  "5/6": "⅚",
  "1/8": "⅛",
  "3/8": "⅜",
  "5/8": "⅝",
  "7/8": "⅞",
};

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Rendert interne Einheiten (QUARTER_UNITS = 24 pro Schlag) als exakten
 * deutschen Schlagwert: 24 → „1 Schlag“, 36 → „1½ Schläge“, 3 → „⅛ Schlag“.
 * Keine gerundeten Dezimalzahlen, kein englischer Dezimalpunkt.
 */
export function unitsToBeatLabel(units: number): string {
  const whole = Math.floor(units / QUARTER_UNITS);
  const restUnits = units - whole * QUARTER_UNITS;

  let fraction = "";
  let fracNumerator = 0;
  let isVulgar = false;
  if (restUnits > 0) {
    const g = gcd(restUnits, QUARTER_UNITS);
    const num = restUnits / g;
    const den = QUARTER_UNITS / g;
    fracNumerator = num;
    const vulgar = VULGAR[`${num}/${den}`];
    isVulgar = vulgar != null;
    fraction = vulgar ?? `${num}/${den}`;
  }

  let value: string;
  if (whole === 0 && fraction) {
    value = fraction;
  } else if (fraction) {
    // „1½“ bei Unicode-Bruch, sonst „1 5/24“ mit Leerzeichen.
    value = isVulgar ? `${whole}${fraction}` : `${whole} ${fraction}`;
  } else {
    value = `${whole}`;
  }

  // Singular nur bei genau „1“ oder einem reinen Bruch mit Zähler 1 (½, ⅛ …).
  const singular =
    (whole === 1 && !fraction) || (whole === 0 && fracNumerator === 1);
  return `${value} ${singular ? "Schlag" : "Schläge"}`;
}
