/**
 * Real, well-known cities per Bezirk, used as orientation reference points
 * on the zoomed-in district map. Normally two: selected by checking actual
 * public population figures against the hand-drawn Bezirk boundary
 * geometry (a point-in-polygon test against the SVG path data, not just
 * the district name) and taking the two largest matches. Two border cases
 * (Wesel, Königswinter) geometrically matched two adjacent districts;
 * assigned to the one with the weaker existing coverage. Bezirk 10 gets a
 * third (Wetzlar) since its main two cities are both in the main shape,
 * leaving its small exclave with no reference point of its own.
 */
export interface BezirkReferenceCity {
  name: string;
  latitude: number;
  longitude: number;
}

export const BEZIRK_REFERENCE_CITIES: Record<number, BezirkReferenceCity[]> = {
  1: [
    { name: "Moers", latitude: 51.4521, longitude: 6.6262 },
    { name: "Kleve", latitude: 51.7878, longitude: 6.1389 },
  ],
  2: [
    { name: "Duisburg", latitude: 51.4344, longitude: 6.7623 },
    { name: "Oberhausen", latitude: 51.4963, longitude: 6.8638 },
  ],
  3: [
    { name: "Essen", latitude: 51.4556, longitude: 7.0116 },
    { name: "Mülheim an der Ruhr", latitude: 51.4266, longitude: 6.8826 },
  ],
  4: [
    { name: "Düsseldorf", latitude: 51.2277, longitude: 6.7735 },
    { name: "Krefeld", latitude: 51.3388, longitude: 6.5853 },
  ],
  5: [
    { name: "Wuppertal", latitude: 51.2562, longitude: 7.1508 },
    { name: "Solingen", latitude: 51.1652, longitude: 7.0671 },
  ],
  6: [
    { name: "Köln", latitude: 50.9375, longitude: 6.9603 },
    { name: "Leverkusen", latitude: 51.0459, longitude: 6.9853 },
  ],
  7: [
    { name: "Aachen", latitude: 50.7753, longitude: 6.0839 },
    { name: "Düren", latitude: 50.8047, longitude: 6.4828 },
  ],
  8: [
    { name: "Bonn", latitude: 50.7374, longitude: 7.0982 },
    { name: "Königswinter", latitude: 50.6789, longitude: 7.1875 },
  ],
  9: [
    { name: "Gummersbach", latitude: 51.0267, longitude: 7.5664 },
    { name: "Wiehl", latitude: 50.9522, longitude: 7.5494 },
  ],
  10: [
    { name: "Neuwied", latitude: 50.4266, longitude: 7.4566 },
    { name: "Rengsdorf", latitude: 50.5394, longitude: 7.5125 },
    { name: "Wetzlar", latitude: 50.5605, longitude: 8.5071 },
  ],
  11: [
    { name: "Bad Kreuznach", latitude: 49.8467, longitude: 7.8667 },
    { name: "Idar-Oberstein", latitude: 49.7206, longitude: 7.3014 },
  ],
  12: [
    { name: "Saarbrücken", latitude: 49.2401, longitude: 6.9969 },
    { name: "Neunkirchen", latitude: 49.3461, longitude: 7.1797 },
  ],
  13: [
    { name: "Troisdorf", latitude: 50.8147, longitude: 7.1497 },
    { name: "Sankt Augustin", latitude: 50.7733, longitude: 7.1875 },
  ],
};
