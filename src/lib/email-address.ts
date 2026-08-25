/**
 * Ob eine Eingabe als E-Mail-Adresse durchgehen kann.
 *
 * Bewusst nachsichtig: verbindlich prüft `z.email()` auf dem Server. Diese
 * Prüfung läuft während der Eingabe und soll die offensichtlichen Fehler früh
 * sichtbar machen — fehlendes @, vergessene Domain, fehlende Endung, ein
 * Leerzeichen mitten in der Adresse. (Rand-Leerzeichen entfernt schon der
 * Browser: `input[type=email]` schneidet sie beim Setzen des Werts ab.) Wäre
 * die Prüfung strenger als der Server, würde sie gültige Adressen blockieren,
 * und das ist der teurere Fehler: eine Anmeldung, die niemand abschicken kann.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isPlausibleEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}
