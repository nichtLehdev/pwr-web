import sharp from "sharp";

export type ImageDimensions = { width: number; height: number };

/**
 * Breite und Höhe, wie der Browser das Bild zeigt: Eine EXIF-Drehung um 90°
 * tauscht die Seiten. null, wenn sharp das Format nicht lesen kann.
 */
export async function readImageDimensions(
  input: Buffer | string,
): Promise<ImageDimensions | null> {
  try {
    const { width, height, orientation } = await sharp(input).metadata();
    if (!width || !height) return null;
    const rotated = orientation !== undefined && orientation >= 5;
    return rotated ? { width: height, height: width } : { width, height };
  } catch {
    return null;
  }
}
