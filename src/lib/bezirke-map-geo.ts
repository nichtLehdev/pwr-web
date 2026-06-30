/**
 * Converts real-world lat/lon coordinates into coordinates on the
 * hand-drawn Bezirke SVG map (viewBox 0 0 1523 2428, see
 * src/app/mitmachen/chor-finden/page.tsx).
 *
 * The artwork has no embedded geo-projection, so a 2D affine transform is
 * fit from three reference points: the map's northmost, southmost and
 * westmost outline points, matched against their real-world coordinates.
 * Validated against ~8 uninvolved reference cities (Köln, Bonn, Aachen,
 * Düsseldorf, Kleve, Krefeld, Wuppertal) landing inside their correct
 * Bezirk, and against Wetzlar (~6km off) for the Bezirk 10 exclave -
 * accurate enough that no rotation/skew correction or extra calibration
 * points are needed.
 */

export const BEZIRKE_MAP_VIEWBOX = { width: 1523, height: 2428 };

interface CalibrationPoint {
  lat: number;
  lon: number;
  svgX: number;
  svgY: number;
}

const CALIBRATION_POINTS: [
  CalibrationPoint,
  CalibrationPoint,
  CalibrationPoint,
] = [
  // Northmost point of the map outline
  {
    lat: 51.90517973522825,
    lon: 6.1565999077709215,
    svgX: 142.9707037037038,
    svgY: 1.0015925925925926,
  },
  // Southmost point of the map outline
  {
    lat: 49.11208942482714,
    lon: 7.056470069661321,
    svgX: 732.0860429687499,
    svgY: 2426.9159921874984,
  },
  // Westmost point of the map outline
  {
    lat: 51.05110638879432,
    lon: 5.866361275836815,
    svgX: 1.0020000000006188,
    svgY: 776.6310000000001,
  },
];

function solveAffineCoefficients(
  points: readonly CalibrationPoint[],
  target: "svgX" | "svgY",
): [number, number, number] {
  const A = points.map((p) => [p.lon, p.lat, 1]);
  const v = points.map((p) => p[target]);

  const det3 = (m: number[][]) =>
    m[0]![0]! * (m[1]![1]! * m[2]![2]! - m[1]![2]! * m[2]![1]!) -
    m[0]![1]! * (m[1]![0]! * m[2]![2]! - m[1]![2]! * m[2]![0]!) +
    m[0]![2]! * (m[1]![0]! * m[2]![1]! - m[1]![1]! * m[2]![0]!);

  const replaceCol = (col: number) =>
    A.map((row, i) => row.map((value, j) => (j === col ? v[i]! : value)));

  const determinant = det3(A);
  return [
    det3(replaceCol(0)) / determinant,
    det3(replaceCol(1)) / determinant,
    det3(replaceCol(2)) / determinant,
  ];
}

const [a, b, c] = solveAffineCoefficients(CALIBRATION_POINTS, "svgX");
const [d, e, f] = solveAffineCoefficients(CALIBRATION_POINTS, "svgY");

// Small residual registration error left over after the affine fit
// (hand-drawn artwork isn't perfectly true to scale everywhere). Dialed in
// visually against known ensemble locations via an on-page calibration tool.
const EMPIRICAL_OFFSET_X = -21;
const EMPIRICAL_OFFSET_Y = 25;

export function geoToBezirkeMapPoint(
  latitude: number,
  longitude: number,
): { x: number; y: number } {
  return {
    x: a * longitude + b * latitude + c + EMPIRICAL_OFFSET_X,
    y: d * longitude + e * latitude + f + EMPIRICAL_OFFSET_Y,
  };
}
