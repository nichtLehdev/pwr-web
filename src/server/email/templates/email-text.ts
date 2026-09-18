import { emailBaseUrl } from "./email-layout";

/**
 * Nur-Text-Fassung (Spamfilter, Text- und Vorlese-Postfächer). Kopf und Fuß
 * stehen hier, die Zeilen kommen aus der Vorlage.
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

  // Nur null fällt raus; leere Zeichenketten sind die Absatztrennung.
  const rumpf = zeilen.filter((z): z is string => z != null);

  return [...kopf, ...rumpf, ...fuss].join("\n");
}

/** Angabe als Zeile im Tabellensatz, z. B. „Start:        02.10.2026“. */
export function textZeile(beschriftung: string, wert: string): string {
  // Nie kürzer als die Beschriftung, sonst klebt der Wert am Doppelpunkt.
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
