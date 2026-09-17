export enum DistrictColor {
  AllDistricts = "#FAA619",
  District1 = "#3B82F6",
  District2 = "#10B981",
  District3 = "#8B5CF6",
  District4 = "#F59E0B",
  District5 = "#EF4444",
  District6 = "#06B6D4",
  District7 = "#EC4899",
  District8 = "#14B8A6",
  District9 = "#6366F1",
  District10 = "#84CC16",
  District11 = "#F97316",
  District12 = "#A855F7",
  District13 = "#22D3EE",
}

export function getDistrictColor(districtNumber?: number): string {
  if (!districtNumber) {
    return DistrictColor.AllDistricts;
  }
  return (
    DistrictColor[`District${districtNumber}` as keyof typeof DistrictColor] ??
    DistrictColor.AllDistricts
  );
}

/** Ohne Aufrufer im Projekt (Stand 17.09.2026). */
export function getDistrictColorLight(districtNumber?: number): string {
  const color = getDistrictColor(districtNumber);
  return color + "20";
}

/**
 * ACHTUNG — löst das Kontrastproblem nicht, obwohl der Name es verspricht.
 *
 * Zwei Fehler: Die Formel unten ist die wahrnehmungsbasierte Helligkeit
 * (0,299R + 0,587G + 0,114B), nicht die WCAG-Relativluminanz. Und selbst mit
 * der richtigen Formel gäbe es keine tragfähige Wahl, weil Schwarz und Weiß
 * zusammen die dreizehn Bezirksfarben nicht abdecken.
 *
 * Nachgemessen am 17.09.2026, Schrift auf der jeweiligen Bezirksfarbe:
 * - Weiß fällt auf ALLEN dreizehn durch (1,81:1 bis 4,47:1).
 * - Tinte trägt bei Kleintext auf neun von dreizehn; Bezirk 3, 5, 9 und 12
 *   liegen zwischen 3,78:1 und 4,48:1.
 * - Diese Funktion selbst lässt bei Kleintext vier durchfallen: Bezirk 1
 *   (3,68:1), 3 (4,23:1), 5 (3,76:1) und 9 (4,47:1) — sie wählt dort Weiß.
 *
 * Richtig ist stattdessen die Markierungsregel: Die Bezirksfarbe steht als
 * Quadrat NEBEN der Schrift, die Schrift selbst auf Papier. Siehe
 * `_components/programmheft/bezirk-label.tsx`; Termin- und Kursliste,
 * Bezirks- und Ensemblelisten machen es inzwischen genauso.
 *
 * Einzige Ausnahme: Großtext ab 24px fett braucht nur 3:1, dort trägt Tinte
 * auf allen dreizehn (schlechtester Wert 3,78:1) — so hält es die Bezirks-
 * kachel auf der Detailseite.
 *
 * Aufrufer: nur `_components/posts/post-card.tsx`, die selbst von niemandem
 * importiert wird. Beides kann zusammen weg.
 */
export function getDistrictTextColor(districtNumber?: number): string {
  const color = getDistrictColor(districtNumber);

  const hex = color.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}
