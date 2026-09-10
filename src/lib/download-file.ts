/**
 * Browser-Download einer Server-Antwort.
 *
 * Den Dateinamen bestimmt der Server im `Content-Disposition`-Header — sonst
 * müsste jede aufrufende Seite die Namensbildung (Kurstitel säubern, Datum
 * anhängen) noch einmal nachbauen und dabei richtig treffen.
 */

/** `filename*=UTF-8''…` bevorzugt, sonst der ASCII-`filename`. */
export function filenameFromContentDisposition(
  header: string | null,
  fallback: string,
): string {
  if (!header) return fallback;

  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1]);
    } catch {
      // Kaputt kodierter Header — dann lieber der Fallback als ein Name
      // voller Prozentzeichen.
    }
  }

  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1] ?? fallback;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadResponseAsFile(
  response: Response,
  fallbackFilename: string,
): Promise<void> {
  const filename = filenameFromContentDisposition(
    response.headers.get("Content-Disposition"),
    fallbackFilename,
  );
  triggerBlobDownload(await response.blob(), filename);
}
