/**
 * Datum und Uhrzeit in deutscher Ortszeit — unabhängig davon, in welcher
 * Zeitzone der Code gerade läuft.
 *
 * Der Server läuft im Container in UTC, und auch Client-Komponenten werden
 * dort zuerst gerendert, Mails und PDFs ohnehin. Ohne feste Zone stand eine
 * Probe um 19:00 im ersten HTML und in jeder Mail als 17:00, ein Kurs ab
 * 00:30 am Vortag — und nach der Hydration ersetzte der Browser das durch
 * seine eigene Zone. Die Termine finden in Deutschland statt und werden in
 * deutscher Zeit gelesen, deshalb läuft jede Anzeige durch diese Helfer:
 * `toLocaleDateString()`, `getDate()` & Co. folgen der Zone der Maschine.
 */

export const ZEITZONE = "Europe/Berlin";

/** Was als Zeitpunkt ankommt: Date, ISO-Zeichenkette (superjson, JSON) oder ms. */
export type Zeitpunkt = Date | string | number;

/**
 * Die Formate, die in der Plattform vorkommen. Die Namen beschreiben das
 * Ergebnis; das Beispiel ist Freitag, 2. Oktober 2026, 19:30 Uhr.
 */
export const FORMAT = {
  /** 2.10.2026 — wie `toLocaleDateString("de-DE")` ohne Optionen. */
  datum: { day: "numeric", month: "numeric", year: "numeric" },
  /** 02.10.2026 */
  datumZweistellig: { day: "2-digit", month: "2-digit", year: "numeric" },
  /** 02.10.26 */
  datumKurz: { day: "2-digit", month: "2-digit", year: "2-digit" },
  /** 2. Oktober 2026 */
  datumLang: { day: "numeric", month: "long", year: "numeric" },
  /** 02. Oktober 2026 */
  datumLangZweistellig: { day: "2-digit", month: "long", year: "numeric" },
  /** 2. Okt. 2026 */
  datumMonatKurz: { day: "numeric", month: "short", year: "numeric" },
  /** 02. Okt. 2026 */
  datumMonatKurzZweistellig: {
    day: "2-digit",
    month: "short",
    year: "numeric",
  },
  /** Freitag, 2. Oktober 2026 */
  datumMitWochentag: {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  },
  /** 2. Oktober */
  tagMonat: { day: "numeric", month: "long" },
  /** 02. Okt. */
  tagMonatKurz: { day: "2-digit", month: "short" },
  /** Oktober 2026 */
  monatJahr: { month: "long", year: "numeric" },
  /** Oktober */
  monat: { month: "long" },
  /** Okt. */
  monatKurz: { month: "short" },
  /** Freitag */
  wochentag: { weekday: "long" },
  /** 19:30 */
  uhrzeit: { hour: "2-digit", minute: "2-digit" },
  /** 02.10.2026, 19:30 */
  datumUhrzeit: {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
  /** 02.10.2026, 19:30:05 */
  datumUhrzeitSekunden: {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  },
  /** 2. Oktober 2026 um 19:30 */
  datumLangUhrzeit: {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
  /** 02. Oktober 2026 um 19:30 */
  datumLangZweistelligUhrzeit: {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
  /** Freitag, 2. Oktober 2026 um 19:30 */
  datumMitWochentagUhrzeit: {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
  /** 02.10., 19:30 */
  tagMonatUhrzeit: {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  },
  /** 02.10.2026, 19:30 — kürzeste eindeutige Form mit Uhrzeit. */
  mittelKurz: { dateStyle: "medium", timeStyle: "short" },
  /** Freitag, 2. Oktober 2026 um 19:30 — über `dateStyle`, wie die Wartungsseite. */
  datumVollUhrzeit: { dateStyle: "full", timeStyle: "short" },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

export type FormatName = keyof typeof FORMAT;

const formatters = new Map<string, Intl.DateTimeFormat>();

/**
 * `Intl.DateTimeFormat` für Deutsch in Berliner Zeit, je Optionssatz nur
 * einmal gebaut — der Aufbau kostet ein Vielfaches des Formatierens, und
 * Tabellen formatieren Hunderte Zellen. Eine mitgegebene `timeZone` wird
 * bewusst überschrieben.
 */
export function berlinFormatter(
  format: FormatName | Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const options = typeof format === "string" ? FORMAT[format] : format;
  const key = typeof format === "string" ? format : JSON.stringify(options);
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("de-DE", {
      ...options,
      timeZone: ZEITZONE,
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

function toDate(value: Zeitpunkt): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Ein Zeitpunkt als deutscher Text in Berliner Zeit. Ohne Format wie
 * `toLocaleDateString("de-DE")`: „2.10.2026“.
 *
 * Ein ungültiges Datum ergibt eine leere Zeichenkette statt „Invalid Date“
 * oder einer Ausnahme, die die ganze Seite reißen würde.
 */
export function formatBerlin(
  value: Zeitpunkt,
  format: FormatName | Intl.DateTimeFormatOptions = "datum",
): string {
  const date = toDate(value);
  return date ? berlinFormatter(format).format(date) : "";
}

/** Kalenderbestandteile eines Zeitpunkts in Berliner Zeit. */
export interface BerlinParts {
  year: number;
  /** 1–12, anders als `getMonth()`. */
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sonntag … 6 = Samstag, wie `getDay()`. */
  weekday: number;
}

// en-US, weil nur die Zahlen gebraucht werden und dessen Teile stabil sind;
// `h23`, weil manche Laufzeiten Mitternacht mit `hour12: false` als „24“ melden.
const PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: ZEITZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

const WEEKDAYS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Jahr, Monat, Tag, Stunde, Minute und Wochentag, wie sie in Deutschland auf
 * der Uhr stehen — Ersatz für `getFullYear()`, `getDate()`, `getHours()` &
 * Co., wo es um Anzeige oder den deutschen Kalendertag geht.
 */
export function berlinParts(value: Zeitpunkt): BerlinParts {
  const date = toDate(value);
  if (!date) {
    return {
      year: NaN,
      month: NaN,
      day: NaN,
      hour: NaN,
      minute: NaN,
      second: NaN,
      weekday: NaN,
    };
  }
  const parts: Record<string, string> = {};
  for (const part of PARTS.formatToParts(date)) parts[part.type] = part.value;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAYS[parts.weekday ?? ""] ?? NaN,
  };
}

/** Abstand Berlins zu UTC in ms zu diesem Zeitpunkt (+1 h Winter, +2 h Sommer). */
function berlinOffset(epochMs: number): number {
  const p = berlinParts(epochMs);
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wall - (epochMs - (((epochMs % 1000) + 1000) % 1000));
}

/**
 * Der Zeitpunkt, an dem in Berlin die angegebene Uhrzeit gilt. Monat 1–12;
 * Überläufe rechnen weiter wie bei `new Date(y, m, d)`, also ist
 * `berlinDate(2026, 12, 32)` der 1. Januar 2027.
 *
 * Der Offset wird am Ergebnis nachgeprüft, weil er sich an den
 * Umstellungstagen zwischen Vermutung und Ergebnis ändern kann. Mitternacht
 * gibt es in Berlin immer genau einmal — umgestellt wird um 2 bzw. 3 Uhr.
 */
export function berlinDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): Date {
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  const guess = wall - berlinOffset(wall);
  return new Date(wall - berlinOffset(guess));
}

/** 00:00 Uhr Berliner Zeit am deutschen Kalendertag dieses Zeitpunkts. */
export function startOfBerlinDay(value: Zeitpunkt): Date {
  const { year, month, day } = berlinParts(value);
  return berlinDate(year, month, day);
}

/** Wie `startOfBerlinDay`, einen Tag weiter: das Ende des Tages, exklusiv. */
export function startOfNextBerlinDay(value: Zeitpunkt): Date {
  const { year, month, day } = berlinParts(value);
  return berlinDate(year, month, day + 1);
}

/**
 * Der deutsche Kalendertag als „2026-10-02“ — sortierbar und vergleichbar,
 * zum Gruppieren nach Tag oder Monat (`.slice(0, 7)`).
 */
export function berlinDayKey(value: Zeitpunkt): string {
  const { year, month, day } = berlinParts(value);
  if (Number.isNaN(year)) return "";
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Fallen beide Zeitpunkte in Deutschland auf denselben Kalendertag? */
export function isSameBerlinDay(a: Zeitpunkt, b: Zeitpunkt): boolean {
  const key = berlinDayKey(a);
  return key !== "" && key === berlinDayKey(b);
}

/** Tage im Monat (1–12) — reine Kalenderrechnung, ohne Zeitzone. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Wochentag eines Kalendertags (0 = Sonntag), ohne Zeitzone. */
export function weekdayOf(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}
