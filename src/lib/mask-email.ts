/**
 * E-Mail-Adresse für Logs unkenntlich machen: `max.mustermann@gmx.de` wird zu
 * `m***@gmx.de`.
 *
 * Ein Newsletter-Versand schrieb bisher jede Empfängeradresse im Klartext in
 * die Server-Logs — Bestandsdaten in einem Speicher ohne Löschkonzept, und
 * mehr, als für die Fehlersuche nötig ist (Art. 5 Abs. 1 lit. c DSGVO).
 *
 * Die Domain bleibt stehen, weil genau sie beim Debuggen zählt: ob GMX
 * blockiert oder t-online verzögert, sieht man nur an ihr.
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
