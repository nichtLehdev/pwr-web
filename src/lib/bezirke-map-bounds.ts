/**
 * Bounding boxes (in the Bezirke SVG's own coordinate space, viewBox
 * 0 0 1523 2428) for each Bezirk, used to "zoom" the map to a single
 * district. Bezirk 10 ("Wied") is drawn as three disconnected shapes (a
 * main area plus two small exclaves reaching toward Wetzlar); its bounds
 * here cover all three so zooming doesn't cut the exclave off.
 */
export interface BezirkMapBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const BEZIRK_MAP_BOUNDS: Record<number, BezirkMapBounds> = {
  1: { minX: 28.7, minY: 4.1, maxX: 542.9, maxY: 458.6 },
  2: { minX: 373.2, minY: 177.2, maxX: 573.1, maxY: 484.2 },
  3: { minX: 512.1, minY: 318.9, maxX: 680.5, maxY: 474.2 },
  4: { minX: 114.6, minY: 379.7, maxX: 724.4, maxY: 872.7 },
  5: { minX: 599.2, minY: 512.5, maxX: 861.6, maxY: 737.1 },
  6: { minX: 358.5, minY: 661.8, maxX: 855.5, maxY: 1013.9 },
  7: { minX: 5.5, minY: 622.3, maxX: 527.7, maxY: 1370.8 },
  8: { minX: 415.4, minY: 955.3, maxX: 752.4, maxY: 1232.2 },
  9: { minX: 800.2, minY: 611.0, maxX: 1070.8, maxY: 961.7 },
  10: { minX: 495.2, minY: 801.2, maxX: 1521.6, maxY: 1617.5 },
  11: { minX: 652.6, minY: 1468.2, maxX: 1199.4, maxY: 2099.9 },
  12: { minX: 165.6, minY: 1324.6, maxX: 1021.1, maxY: 2426.9 },
  13: { minX: 648.4, minY: 788.9, maxX: 964.8, maxY: 1140.6 },
};

const ZOOM_PADDING_RATIO = 0.12;
const FULL_MAP_WIDTH = 1523;
const FULL_MAP_HEIGHT = 2428;

export interface ViewBoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The currently visible viewBox as numbers - the padded district bounds
 * when zoomed, or the full map otherwise.
 */
export function getVisibleViewBoxRect(
  bezirkNumber: number | null,
): ViewBoxRect {
  if (bezirkNumber === null) {
    return { x: 0, y: 0, width: FULL_MAP_WIDTH, height: FULL_MAP_HEIGHT };
  }

  const bounds = BEZIRK_MAP_BOUNDS[bezirkNumber];
  if (!bounds) {
    return { x: 0, y: 0, width: FULL_MAP_WIDTH, height: FULL_MAP_HEIGHT };
  }

  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const padX = width * ZOOM_PADDING_RATIO;
  const padY = height * ZOOM_PADDING_RATIO;

  return {
    x: bounds.minX - padX,
    y: bounds.minY - padY,
    width: width + padX * 2,
    height: height + padY * 2,
  };
}

export function getBezirkZoomViewBox(bezirkNumber: number): string {
  const rect = getVisibleViewBoxRect(bezirkNumber);
  return `${rect.x} ${rect.y} ${rect.width} ${rect.height}`;
}

/**
 * Width (in SVG user units) of the currently visible viewBox. Markers and
 * labels should size themselves proportionally to this so they look the
 * same on screen regardless of whether a small or large district is
 * zoomed into (a fixed unit size looks huge on a small district and tiny
 * on a large one, since the same screen width maps to far fewer or far
 * more SVG units).
 */
export function getVisibleViewBoxWidth(bezirkNumber: number | null): number {
  return getVisibleViewBoxRect(bezirkNumber).width;
}
