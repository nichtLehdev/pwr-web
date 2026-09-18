/**
 * Datum und Uhrzeit in deutscher Ortszeit. Der Server (SSR, Mails, PDFs) läuft in UTC, und
 * `toLocaleDateString()`, `getDate()` & Co. folgen der Zone der Maschine — daher diese Helfer.
 */

export const ZEITZONE = "Europe/Berlin";

/** Was als Zeitpunkt ankommt: Date, ISO-Zeichenkette (superjson, JSON) oder ms. */
export type Zeitpunkt = Date | string | number;

/** Beispiele jeweils für Freitag, 2. Oktober 2026, 19:30 Uhr. */
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
 * `Intl.DateTimeFormat` in Berliner Zeit, je Optionssatz gecacht (der Aufbau ist teuer).
 * Eine mitgegebene `timeZone` wird bewusst überschrieben.
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
 * Zeitpunkt als deutscher Text in Berliner Zeit, ohne Format „2.10.2026“.
 * Ein ungültiges Datum ergibt "" statt „Invalid Date“ oder einer Ausnahme.
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

/** Ersatz für `getFullYear()`, `getDate()`, `getHours()` & Co. in Berliner Zeit. */
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
 * Zeitpunkt, an dem in Berlin diese Uhrzeit gilt. Monat 1–12, Überläufe wie bei `new Date(y, m, d)`.
 * Der Offset wird am Ergebnis nachgeprüft, weil er sich an Umstellungstagen ändern kann.
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
