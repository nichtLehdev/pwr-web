/**
 * IP-Adresse der anfragenden Person, sofern der Proxy sie durchreicht.
 *
 * Bewusst getrennt von `clientKeyFromHeaders()`: das Rate-Limit braucht immer
 * einen Schlüssel und nimmt notfalls "unknown". Ein Einwilligungsnachweis darf
 * dagegen keine erfundene Adresse enthalten — fehlt sie, bleibt das Feld leer,
 * und das ist ehrlicher als ein Platzhalter, der später wie ein Beleg aussieht.
 */

/** Reicht für IPv6 mit IPv4-Suffix; alles Längere ist manipulierter Header. */
const MAX_IP_LENGTH = 45;

export function clientIpFromHeaders(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  const candidate =
    forwarded?.split(",")[0]?.trim() ?? headers.get("x-real-ip");
  const ip = candidate?.trim();
  if (!ip) return null;
  return ip.slice(0, MAX_IP_LENGTH);
}
