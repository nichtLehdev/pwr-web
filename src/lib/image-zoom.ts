/**
 * Hilfen für vergrößerbare Bilder (`ZoomableImage`, Lightbox, Bilder im
 * Beitragstext). Rein rechnerisch, damit sie ohne DOM testbar sind.
 */

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Name des Vergrößern-Buttons; das Alt steht mit drin, sonst hieße jeder gleich. */
export function zoomLabel(alt: string | null | undefined): string {
  const text = alt?.trim();
  return text ? `Bild vergrößern: ${text}` : "Bild vergrößern";
}

/**
 * Rechteck, das ein Bild mit `object-fit: contain` tatsächlich einnimmt;
 * `null`, solange die Vorlagengröße unbekannt ist (Bild noch nicht geladen).
 */
export function containedRect(
  box: Box,
  naturalWidth: number,
  naturalHeight: number,
): Box | null {
  if (naturalWidth <= 0 || naturalHeight <= 0) return null;
  const scale = Math.min(box.width / naturalWidth, box.height / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  return {
    left: box.left + (box.width - width) / 2,
    top: box.top + (box.height - height) / 2,
    width,
    height,
  };
}

/**
 * Liegt der Punkt auf dem sichtbaren Foto? Ohne bekannte Vorlagengröße zählt
 * das ganze Element als Foto — lieber einmal nicht schließen als versehentlich.
 */
export function isOnContainedImage(
  box: Box,
  naturalWidth: number,
  naturalHeight: number,
  x: number,
  y: number,
): boolean {
  const rect = containedRect(box, naturalWidth, naturalHeight) ?? box;
  return (
    x >= rect.left &&
    x <= rect.left + rect.width &&
    y >= rect.top &&
    y <= rect.top + rect.height
  );
}
