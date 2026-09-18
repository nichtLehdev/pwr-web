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
 * Keine Schrift direkt auf Bezirksfarbe: Weder Weiß noch Schwarz besteht WCAG auf allen
 * dreizehn. Farbe als Quadrat neben die Schrift, siehe `_components/programmheft/bezirk-label.tsx`.
 */
