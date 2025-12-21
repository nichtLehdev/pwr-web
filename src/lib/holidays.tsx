/**
 * German Public Holidays Utility
 * Calculates German public holidays based on Easter date
 */

import React from "react";

// Holiday icon components
const icons = {
  sparkles: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  ),
  crown: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L15 8.5L22 9L17 14L18.5 21L12 17.5L5.5 21L7 14L2 9L9 8.5L12 2Z" />
    </svg>
  ),
  cross: (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
    >
      <path d="M12 2v20M5 9h14" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  egg: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8 2 4 6.5 4 12c0 4.5 3.5 10 8 10s8-5.5 8-10c0-5.5-4-10-8-10z" />
    </svg>
  ),
  cloud: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.5 17.5c-1.4 0-2.6-.5-3.5-1.4C2 15.1 1.5 13.9 1.5 12.5c0-1.2.3-2.3.9-3.2.6-.9 1.5-1.6 2.6-2 .2-1.7 1-3.2 2.2-4.3C8.4 1.8 10 1 11.8 1c1.4 0 2.7.4 3.8 1.2 1.1.8 2 1.9 2.5 3.2 1.6.2 3 1 4 2.2 1 1.2 1.5 2.7 1.5 4.3 0 1.8-.6 3.3-1.9 4.6-1.2 1.3-2.8 1.9-4.6 1.9h-11z" />
    </svg>
  ),
  flame: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c-.8 2-2 3.5-3.5 5.5C7 9.5 6 11.5 6 14c0 3.3 2.7 6 6 6s6-2.7 6-6c0-2.5-1-4.5-2.5-6.5C14 5.5 12.8 4 12 2z" />
    </svg>
  ),
  wrench: (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
    >
      <path
        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  flag: (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
    >
      <path
        d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  church: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l-1 1v2H9v2l3 2v2l-8 4v9h16v-9l-8-4v-2l3-2V5h-2V3l-1-1zm0 2.5V5h2v1.5L12 8 9.5 6.5V5h2V4.5zm0 4.5l6 3v8H6v-8l6-3z" />
    </svg>
  ),
  candle: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c-.5 1-1 2-1 3 0 1.1.9 2 2 2s2-.9 2-2c0-1-0.5-2-1-3h-2zm-1 6v14h2V8h-2z" />
    </svg>
  ),
  tree: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l-2 4h1l-2 4h1l-3 6h4v6h4v-6h4l-3-6h1l-2-4h1l-2-4z" />
    </svg>
  ),
  gift: (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
    >
      <path
        d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  oneCandle: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <ellipse cx="12" cy="4" rx="2" ry="3" fill="#FFA500" />
      <rect x="11" y="6" width="2" height="12" rx="0.5" />
      <rect x="10" y="17" width="4" height="2" rx="0.5" />
    </svg>
  ),
  twoCandles: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <ellipse cx="9" cy="4" rx="1.5" ry="2.5" fill="#FFA500" />
      <rect x="8.2" y="6" width="1.6" height="10" rx="0.4" />
      <ellipse cx="15" cy="4" rx="1.5" ry="2.5" fill="#FFA500" />
      <rect x="14.2" y="6" width="1.6" height="10" rx="0.4" />
      <rect x="7" y="15" width="10" height="2" rx="0.5" />
    </svg>
  ),
  threeCandles: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <ellipse cx="7" cy="3" rx="1.3" ry="2" fill="#FFA500" />
      <rect x="6.3" y="5" width="1.4" height="9" rx="0.3" />
      <ellipse cx="12" cy="3" rx="1.3" ry="2" fill="#FFA500" />
      <rect x="11.3" y="5" width="1.4" height="9" rx="0.3" />
      <ellipse cx="17" cy="3" rx="1.3" ry="2" fill="#FFA500" />
      <rect x="16.3" y="5" width="1.4" height="9" rx="0.3" />
      <rect x="5" y="13" width="14" height="2" rx="0.5" />
    </svg>
  ),
  fourCandles: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <ellipse cx="6" cy="3" rx="1.2" ry="2" fill="#FFA500" />
      <rect x="5.4" y="4.5" width="1.2" height="8" rx="0.3" />
      <ellipse cx="10" cy="3" rx="1.2" ry="2" fill="#FFA500" />
      <rect x="9.4" y="4.5" width="1.2" height="8" rx="0.3" />
      <ellipse cx="14" cy="3" rx="1.2" ry="2" fill="#FFA500" />
      <rect x="13.4" y="4.5" width="1.2" height="8" rx="0.3" />
      <ellipse cx="18" cy="3" rx="1.2" ry="2" fill="#FFA500" />
      <rect x="17.4" y="4.5" width="1.2" height="8" rx="0.3" />
      <rect x="4" y="12" width="16" height="2" rx="0.5" />
    </svg>
  ),
  heiligabend: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="5" fill="#FFD700" />
      <path
        d="M12 2v4M12 18v4M2 12h4M18 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"
        stroke="#FFD700"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  silvester: (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#00BFFF"
      strokeWidth="1.5"
    >
      <path d="M12 22V8M12 8l3 3M12 8l-3 3" strokeLinecap="round" />
      <circle cx="12" cy="5" r="2" fill="#00BFFF" />
      <path d="M12 2v2" strokeLinecap="round" />
      <path d="M16 4l-1 1" strokeLinecap="round" />
      <path d="M8 4l1 1" strokeLinecap="round" />
    </svg>
  ),
};

export interface Holiday {
  name: string;
  date: Date;
  isNationwide: boolean; // Some holidays are state-specific
  icon: React.ReactNode;
  states?: string[]; // German states where this holiday is valid (if not nationwide)
  description?: string; // Short description of the holiday
  isLegalHoliday?: boolean; // False for religious/observance days that aren't legal holidays
}

/**
 * Calculates Easter Sunday using the Meeus/Jones/Butcher algorithm
 */
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

/**
 * Gets all German public holidays for a given year
 */
export function getGermanPublicHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = [];
  const easter = getEasterSunday(year);

  // Fixed holidays
  holidays.push({
    name: "Neujahr",
    date: new Date(year, 0, 1),
    isNationwide: true,
    icon: icons.sparkles,
    description: "Beginn des neuen Kalenderjahres",
  });

  holidays.push({
    name: "Heilige Drei Könige",
    date: new Date(year, 0, 6),
    isNationwide: false,
    icon: icons.crown,
    states: ["Baden-Württemberg", "Bayern", "Sachsen-Anhalt"],
    description: "Fest der Erscheinung des Herrn",
  });

  // Easter-based holidays
  // Good Friday (Karfreitag)
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  holidays.push({
    name: "Karfreitag",
    date: goodFriday,
    isNationwide: true,
    icon: icons.cross,
    description: "Gedenktag der Kreuzigung Jesu",
  });

  // Easter Monday (Ostermontag)
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  holidays.push({
    name: "Ostermontag",
    date: easterMonday,
    isNationwide: true,
    icon: icons.egg,
    description: "Tag nach dem Ostersonntag",
  });

  // Ascension Day (Christi Himmelfahrt) - 39 days after Easter
  const ascensionDay = new Date(easter);
  ascensionDay.setDate(easter.getDate() + 39);
  holidays.push({
    name: "Christi Himmelfahrt",
    date: ascensionDay,
    isNationwide: true,
    icon: icons.cloud,
    description: "Rückkehr Jesu zu Gott",
  });

  // Whit Sunday (Pfingstsonntag) - 49 days after Easter
  const whitSunday = new Date(easter);
  whitSunday.setDate(easter.getDate() + 49);
  holidays.push({
    name: "Pfingstsonntag",
    date: whitSunday,
    isNationwide: false,
    icon: icons.flame,
    states: ["Brandenburg"],
    description: "Pfingsten (Fest des Heiligen Geistes)",
  });

  // Whit Monday (Pfingstmontag) - 50 days after Easter
  const whitMonday = new Date(easter);
  whitMonday.setDate(easter.getDate() + 50);
  holidays.push({
    name: "Pfingstmontag",
    date: whitMonday,
    isNationwide: true,
    icon: icons.flame,
    description: "Tag nach Pfingsten (Fest des Heiligen Geistes)",
  });

  // Corpus Christi (Fronleichnam) - 60 days after Easter
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(easter.getDate() + 60);
  holidays.push({
    name: "Fronleichnam",
    date: corpusChristi,
    isNationwide: false,
    icon: icons.cross,
    states: [
      "Baden-Württemberg",
      "Bayern",
      "Hessen",
      "Nordrhein-Westfalen",
      "Rheinland-Pfalz",
      "Saarland",
    ],
    description: "Hochfest des Leibes und Blutes Christi",
  });

  // Fixed holidays (continued)
  holidays.push({
    name: "Tag der Arbeit",
    date: new Date(year, 4, 1),
    isNationwide: true,
    icon: icons.wrench,
    description: "Internationaler Tag der Arbeiterbewegung",
  });

  holidays.push({
    name: "Mariä Himmelfahrt",
    date: new Date(year, 7, 15),
    isNationwide: false,
    icon: icons.cloud,
    states: ["Bayern (teilweise)", "Saarland"],
    description: "Aufnahme Mariens in den Himmel",
  });

  holidays.push({
    name: "Tag der Deutschen Einheit",
    date: new Date(year, 9, 3),
    isNationwide: true,
    icon: icons.flag,
    description: "Nationalfeiertag zur Deutschen Wiedervereinigung",
  });

  holidays.push({
    name: "Reformationstag",
    date: new Date(year, 9, 31),
    isNationwide: false,
    icon: icons.church,
    states: [
      "Brandenburg",
      "Bremen",
      "Hamburg",
      "Mecklenburg-Vorpommern",
      "Niedersachsen",
      "Sachsen",
      "Sachsen-Anhalt",
      "Schleswig-Holstein",
      "Thüringen",
    ],
    description: "Gedenktag der Reformation durch Martin Luther",
  });

  holidays.push({
    name: "Allerheiligen",
    date: new Date(year, 10, 1),
    isNationwide: false,
    icon: icons.candle,
    states: [
      "Baden-Württemberg",
      "Bayern",
      "Nordrhein-Westfalen",
      "Rheinland-Pfalz",
      "Saarland",
    ],
    description: "Gedenktag aller Heiligen",
  });

  // Christmas holidays
  holidays.push({
    name: "1. Weihnachtsfeiertag",
    date: new Date(year, 11, 25),
    isNationwide: true,
    icon: icons.tree,
    description: "Geburt Jesu Christi",
  });

  holidays.push({
    name: "2. Weihnachtsfeiertag",
    date: new Date(year, 11, 26),
    isNationwide: true,
    icon: icons.gift,
    description: "Zweiter Weihnachtsfeiertag (Stephanus-Tag)",
  });

  const christmas = new Date(year, 11, 25);
  const christmasDayOfWeek = christmas.getDay();
  const daysUntilPreviousSunday =
    christmasDayOfWeek === 0 ? 7 : christmasDayOfWeek;

  const fourthAdvent = new Date(christmas);
  fourthAdvent.setDate(christmas.getDate() - daysUntilPreviousSunday);

  const thirdAdvent = new Date(fourthAdvent);
  thirdAdvent.setDate(fourthAdvent.getDate() - 7);

  const secondAdvent = new Date(thirdAdvent);
  secondAdvent.setDate(thirdAdvent.getDate() - 7);

  const firstAdvent = new Date(secondAdvent);
  firstAdvent.setDate(secondAdvent.getDate() - 7);

  // Totensonntag (last Sunday before 1st Advent)
  const totensonntag = new Date(firstAdvent);
  totensonntag.setDate(firstAdvent.getDate() - 7);

  holidays.push({
    name: "Totensonntag",
    date: totensonntag,
    isNationwide: true,
    icon: icons.candle,
    description: "Evangelischer Gedenktag für Verstorbene",
    isLegalHoliday: false,
  });

  holidays.push({
    name: "1. Advent",
    date: firstAdvent,
    isNationwide: true,
    icon: icons.oneCandle,
    description: "Erster Adventssonntag",
    isLegalHoliday: false,
  });

  holidays.push({
    name: "2. Advent",
    date: secondAdvent,
    isNationwide: true,
    icon: icons.twoCandles,
    description: "Zweiter Adventssonntag",
    isLegalHoliday: false,
  });

  holidays.push({
    name: "3. Advent",
    date: thirdAdvent,
    isNationwide: true,
    icon: icons.threeCandles,
    description: "Dritter Adventssonntag",
    isLegalHoliday: false,
  });

  holidays.push({
    name: "4. Advent",
    date: fourthAdvent,
    isNationwide: true,
    icon: icons.fourCandles,
    description: "Vierter Adventssonntag",
    isLegalHoliday: false,
  });

  holidays.push({
    name: "Heiligabend",
    date: new Date(year, 11, 24),
    isNationwide: true,
    icon: icons.heiligabend,
    description: "Heiliger Abend (kein gesetzlicher Feiertag)",
    isLegalHoliday: false,
  });

  holidays.push({
    name: "Silvester",
    date: new Date(year, 11, 31),
    isNationwide: true,
    icon: icons.silvester,
    description: "Silvester (kein gesetzlicher Feiertag)",
    isLegalHoliday: false,
  });

  return holidays;
}

/**
 * Checks if a given date is a German public holiday
 */
export function isGermanPublicHoliday(date: Date): Holiday | null {
  const year = date.getFullYear();
  const holidays = getGermanPublicHolidays(year);

  const dateStr = date.toDateString();
  return (
    holidays.find((holiday) => holiday.date.toDateString() === dateStr) || null
  );
}

/**
 * Gets holidays for a specific month
 */
export function getHolidaysForMonth(year: number, month: number): Holiday[] {
  const holidays = getGermanPublicHolidays(year);
  return holidays.filter((holiday) => holiday.date.getMonth() === month);
}
