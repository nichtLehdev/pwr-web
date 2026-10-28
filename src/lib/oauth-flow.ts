/**
 * Ob eine Seite im Rahmen einer OAuth-Freigabe geöffnet wurde: better-auth
 * schickt dann `client_id` mit und signiert die Anfrage (`sig`).
 */
export function isOAuthAuthorizeQuery(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.has("sig") && params.has("client_id");
}

/**
 * Antwort von Anmeldung/2FA-Prüfung im OAuth-Ablauf: better-auth setzt die
 * Freigabe selbst fort und liefert das nächste Ziel (Zustimmung oder Client).
 */
export function oauthContinueUrl(data: unknown): string | null {
  if (
    typeof data === "object" &&
    data !== null &&
    "redirect" in data &&
    data.redirect === true &&
    "url" in data &&
    typeof data.url === "string"
  ) {
    return data.url;
  }
  return null;
}
