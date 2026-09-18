/**
 * Bewusst nachsichtiger als `z.email()` auf dem Server: Zu streng blockierte gültige
 * Adressen, und eine Anmeldung, die niemand abschicken kann, ist der teurere Fehler.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isPlausibleEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}
