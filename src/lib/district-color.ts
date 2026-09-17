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

/*
 * Hier stand `getDistrictTextColor`: eine Funktion, die die Schriftfarbe auf
 * einer Bezirksfarbe wählen sollte. Sie ist am 17.09.2026 entfernt worden,
 * zusammen mit ihrem einzigen Aufrufer `_components/posts/post-card.tsx`.
 *
 * Der Grund als Warnung für den Fall, dass jemand so etwas neu bauen will:
 * Sie rechnete mit wahrnehmungsbasierter Helligkeit statt WCAG-Relativluminanz
 * — und selbst richtig gerechnet gibt es keine tragfähige Wahl, weil Schwarz
 * und Weiß zusammen die dreizehn Bezirksfarben nicht abdecken. Nachgemessen:
 * Weiß fällt auf ALLEN dreizehn durch (1,81:1 bis 4,47:1), Tinte bei Kleintext
 * auf vier (Bezirk 3, 5, 9, 12).
 *
 * Richtig ist die Markierungsregel: Die Bezirksfarbe steht als Quadrat NEBEN
 * der Schrift, die Schrift selbst auf Papier. Siehe
 * `_components/programmheft/bezirk-label.tsx`. Einzige Ausnahme ist Großtext
 * ab 24px fett (Schwelle 3:1) — so hält es die Bezirkskachel auf der
 * Detailseite.
 */
