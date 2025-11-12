export const districtColors: Record<string, string> = {
  'All Districts': '#FAA619',
  'District 1': '#3B82F6',
  'District 2': '#10B981',
  'District 3': '#8B5CF6',
  'District 4': '#F59E0B',
  'District 5': '#EF4444',
  'District 6': '#06B6D4',
  'District 7': '#EC4899',
  'District 8': '#14B8A6',
  'District 9': '#6366F1',
  'District 10': '#84CC16',
  'District 11': '#F97316',
  'District 12': '#A855F7',
  'District 13': '#22D3EE',
};

export function getDistrictColor(districtName: string): string {
  return districtColors[districtName] || districtColors['All Districts'];
}

// Hellere Version für Hintergründe
export function getDistrictColorLight(districtName: string): string {
  const color = getDistrictColor(districtName);
  return color + '20'; // 20 = 12.5% opacity in hex
}

// Für Text auf farbigem Hintergrund (weiß oder schwarz je nach Helligkeit)
export function getDistrictTextColor(districtName: string): string {
  const color = getDistrictColor(districtName);
  // Einfache Heuristik: hex zu RGB und Luminanz berechnen
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}