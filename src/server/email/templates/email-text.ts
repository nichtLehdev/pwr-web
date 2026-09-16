import { emailBaseUrl } from "./email-layout";

/**
 * Nur-Text-Fassung einer E-Mail.
 *
 * Bisher ging jede Mail als reines HTML raus. Das schadet der Zustellbarkeit
 * (Spamfilter bewerten fehlende Textfassungen schlechter) und schließt alle
 * aus, die ihr Postfach auf Text stellen oder es vorlesen lassen.
 *
 * Die Zeilen kommen aus der jeweiligen Vorlage; Kopf und Fuß stehen hier,
 * damit sie nicht wieder fünfzehnmal dupliziert werden.
 */
export function emailText(zeilen: (string | null | undefined)[]): string {
  const kopf = [
    "POSAUNENWERK RHEINLAND",
    "Posaunenwerk der Evangelischen Kirche im Rheinland",
    "=".repeat(52),
    "",
  ];

  const fuss = [
    "",
    "-".repeat(52),
    "Posaunenwerk der Evangelischen Kirche im Rheinland e.V.",
    "Rudolf-Harbig-Str. 20 · 56179 Vallendar",
    emailBaseUrl(),
  ];

  // Nur weggelassene Abschnitte (null) fallen raus. Leere Zeichenketten
  // bleiben stehen — sie sind die Absatztrennung, ohne sie steht der ganze
  // Text als eine Mauer da.
  const rumpf = zeilen.filter((z): z is string => z != null);

  return [...kopf, ...rumpf, ...fuss].join("\n");
}

/**
 * Eine Angabe als Zeile im Tabellensatz, z. B. „Start:        02.10.2026“.
 * Die Beschriftung wird auf eine feste Breite gebracht, damit die Werte
 * untereinander stehen — das Pendant zur Werttabelle im HTML.
 */
export function textZeile(beschriftung: string, wert: string): string {
  // Feste Breite 18, aber nie kürzer als die Beschriftung selbst: Sonst klebt
  // der Wert bei langen Beschriftungen direkt am Doppelpunkt
  // („Ursprünglicher Betrag:310,00 €“).
  const kopf = `${beschriftung}:`;
  return `${kopf.padEnd(Math.max(22, kopf.length + 1))}${wert}`;
}

/**
 * Ein Knopf im HTML wird in der Textfassung zur benannten Adresse: erst was
 * dahinterliegt, dann die Adresse selbst in eigener Zeile.
 */
export function textLink(beschreibung: string, url: string): string {
  return `${beschreibung}\n${url}`;
}
