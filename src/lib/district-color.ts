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

// Hellere Version für Hintergründe
export function getDistrictColorLight(districtNumber?: number): string {
  const color = getDistrictColor(districtNumber);
  return color + "20"; // 20 = 12.5% opacity in hex
}

// Für Text auf farbigem Hintergrund (weiß oder schwarz je nach Helligkeit)
export function getDistrictTextColor(districtNumber?: number): string {
  const color = getDistrictColor(districtNumber);
  // Einfache Heuristik: hex zu RGB und Luminanz berechnen
  const hex = color.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}
