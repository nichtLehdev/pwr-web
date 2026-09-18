/**
 * Für Logs: `m***@gmx.de` (Datenminimierung, Art. 5 Abs. 1 lit. c DSGVO). Die
 * Domain bleibt, weil sie beim Debuggen zählt (GMX blockiert, t-online verzögert).
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "(keine Adresse)";

  const at = email.lastIndexOf("@");
  if (at <= 0) return "***";

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!domain) return "***";

  return `${local[0]}***@${domain}`;
}
