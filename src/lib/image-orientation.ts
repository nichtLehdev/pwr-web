import type { CSSProperties } from "react";

type Measured = { width: number | null; height: number | null };

/** Hochformat nur bei bekannten Maßen; ohne Maße bleibt der Querformat-Schnitt. */
export function isPortrait(image: Measured | null | undefined): boolean {
  return !!image?.width && !!image?.height && image.height > image.width;
}

/** Rahmen im Seitenverhältnis des Bildes, damit nichts beschnitten wird. */
export function naturalAspectStyle(image: Measured): CSSProperties | undefined {
  return image.width && image.height
    ? { aspectRatio: `${image.width} / ${image.height}` }
    : undefined;
}
