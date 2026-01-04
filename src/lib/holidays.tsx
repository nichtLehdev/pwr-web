/**
 * German Public Holidays Utility
 * Calculates German public holidays based on Easter date
 */

import {
  CloudIcon,
  CrossIcon,
  CrownIcon,
  EggIcon,
  FlameIcon,
  GiftIcon,
  SparkleIcon,
} from "lucide-react";
import React from "react";
import { WrenchIcon } from "lucide-react";
import { FlagIcon } from "lucide-react";
import { ChurchIcon } from "lucide-react";

const icons = {
  sparkles: <SparkleIcon className="h-4 w-4" />,
  crown: <CrownIcon className="h-4 w-4" />,
  cross: <CrossIcon className="h-4 w-4" />,
  egg: <EggIcon className="h-4 w-4" />,
  cloud: <CloudIcon className="h-4 w-4" />,
  flame: <FlameIcon className="h-4 w-4" />,
  wrench: <WrenchIcon className="h-4 w-4" />,
  flag: <FlagIcon className="h-4 w-4" />,
  church: <ChurchIcon className="h-4 w-4" />,
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
  gift: <GiftIcon className="h-4 w-4" />,
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
      <circle cx="12" cy="12" r="5" fill="currentColor" />
      <path
        d="M12 2v4M12 18v4M2 12h4M18 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"
        stroke="currentColor"
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

  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  holidays.push({
    name: "Karfreitag",
    date: goodFriday,
    isNationwide: true,
    icon: icons.cross,
    description: "Gedenktag der Kreuzigung Jesu",
  });

  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  holidays.push({
    name: "Ostermontag",
    date: easterMonday,
    isNationwide: true,
    icon: icons.egg,
    description: "Tag nach dem Ostersonntag",
  });

  const ascensionDay = new Date(easter);
  ascensionDay.setDate(easter.getDate() + 39);
  holidays.push({
    name: "Christi Himmelfahrt",
    date: ascensionDay,
    isNationwide: true,
    icon: icons.cloud,
    description: "Rückkehr Jesu zu Gott",
  });

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

  const whitMonday = new Date(easter);
  whitMonday.setDate(easter.getDate() + 50);
  holidays.push({
    name: "Pfingstmontag",
    date: whitMonday,
    isNationwide: true,
    icon: icons.flame,
    description: "Tag nach Pfingsten (Fest des Heiligen Geistes)",
  });

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
