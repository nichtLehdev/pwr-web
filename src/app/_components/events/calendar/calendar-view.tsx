/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { getDistrictColor } from "@/lib/district-color";
import type { CalendarItem } from "@/lib/types/calendar";
import { ChevronLeft, ChevronRight, XCircleIcon, XIcon } from "lucide-react";
import { Heading } from "@/app/_components/programmheft/section-head";
import { ProgrammeList } from "@/app/_components/programmheft/programme";
import {
  courseEntry,
  eventEntry,
  type ProgrammeEntry,
} from "@/app/_components/programmheft/programme-data";
import {
  berlinDate,
  berlinParts,
  daysInMonth as countDaysInMonth,
  formatBerlin,
  startOfBerlinDay,
  startOfNextBerlinDay,
  weekdayOf,
} from "@/lib/berlin-time";

interface CalendarViewProps {
  items: CalendarItem[];
}

/** Ein Kalendermonat in Deutschland; `month` läuft von 1 bis 12. */
type CalendarMonth = { year: number; month: number };

function currentBerlinMonth(): CalendarMonth {
  const { year, month } = berlinParts(new Date());
  return { year, month };
}

/**
 * Tage, Monat und „heute" in Berliner Zeit: Der Kalender rendert zuerst auf
 * dem Server (UTC), und mit `new Date(y, m, d)` & Co. stand ein Termin um
 * 00:30 dort am Vortag. `selectedDate` ist deshalb immer 00:00 Uhr Berliner
 * Zeit des gewählten Tages.
 */
export default function CalendarView({ items }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    startOfBerlinDay(new Date()),
  );
  const [currentMonth, setCurrentMonth] =
    useState<CalendarMonth>(currentBerlinMonth);
  const calendarNow = useMemo(() => startOfBerlinDay(new Date()), []);

  /**
   * Termin oder Kurs als Programmzeile. `eventEntry`/`courseEntry` stammen aus
   * dem Programmheft-Baustein; das Mitmachangebot hat dort keinen eigenen
   * Platz, deshalb steht es hier als Statuszeile.
   */
  const toProgrammeEntry = (item: CalendarItem): ProgrammeEntry => {
    if (item.type === "event") {
      const entry = eventEntry(item);
      if (!item.cancelled && item.openToParticipants) {
        entry.status = { text: "Mitspielen möglich!", tone: "muted" };
      }
      return entry;
    }
    return courseEntry(item, calendarNow);
  };

  const calendarItems = items.map((item) => ({
    ...item,
    date: new Date(
      item.type === "event" ? (item as any).eventDate : (item as any).startDate,
    ),
  }));

  const { year, month } = currentMonth;
  const daysInMonth = countDaysInMonth(year, month);
  const startingDayOfWeek = (weekdayOf(year, month, 1) + 6) % 7;

  /** Termine, die in [startOfDay, startOfNextDay) fallen; Kurse, die ihn berühren. */
  const itemsBetween = (startOfDay: Date, startOfNextDay: Date) =>
    calendarItems.filter((item) => {
      if (item.type === "course") {
        const course = item;
        const endDate = new Date(course.endDate);
        return item.date < startOfNextDay && endDate >= startOfDay;
      }

      return item.date >= startOfDay && item.date < startOfNextDay;
    });

  const getEventsForDay = (day: number) =>
    itemsBetween(
      berlinDate(year, month, day),
      berlinDate(year, month, day + 1),
    );

  const getCourseStatusForDay = (day: number) => {
    const startOfDay = berlinDate(year, month, day);
    const startOfNextDay = berlinDate(year, month, day + 1);

    const courses = calendarItems.filter((item) => item.type === "course");

    for (const course of courses) {
      const startDate = course.date;
      const endDate = new Date(course.endDate);

      if (startDate >= startOfDay && startDate < startOfNextDay) {
        return "start";
      }

      if (endDate >= startOfDay && endDate < startOfNextDay) {
        return "end";
      }

      if (startDate < startOfDay && endDate >= startOfNextDay) {
        return "ongoing";
      }
    }

    return null;
  };

  const getItemsForSelectedDay = () =>
    itemsBetween(
      startOfBerlinDay(selectedDate),
      startOfNextBerlinDay(selectedDate),
    ).sort((a, b) => a.date.getTime() - b.date.getTime());

  const getUpcomingItems = () => {
    const startOfNextDay = startOfNextBerlinDay(selectedDate);

    return calendarItems
      .filter((item) => item.date >= startOfNextDay)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 10);
  };

  const todayItems = getItemsForSelectedDay();
  const upcomingItems = getUpcomingItems();

  const goToPreviousMonth = () => {
    setCurrentMonth(
      month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 },
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 },
    );
  };

  const goToToday = () => {
    setCurrentMonth(currentBerlinMonth());
    setSelectedDate(startOfBerlinDay(new Date()));
  };

  const monthName = formatBerlin(berlinDate(year, month, 1), "monatJahr");
  const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  const isToday = (day: number) => {
    const today = berlinParts(new Date());
    return day === today.day && month === today.month && year === today.year;
  };

  const selectedParts = berlinParts(selectedDate);
  const isSelected = (day: number) =>
    day === selectedParts.day &&
    month === selectedParts.month &&
    year === selectedParts.year;

  return (
    <div className="space-y-6">
      {/* Mobile Kalender (< lg) */}
      <div className="lg:hidden">
        {/* Kalender Header */}
        <div className="border-ink dark:border-night-text bg-paper dark:bg-night border-2 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="condensed text-ink dark:text-night-text text-xl font-extrabold">
              {monthName}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={goToPreviousMonth}
                className="text-ink hover:bg-ink hover:text-paper dark:text-night-text dark:hover:bg-night-text dark:hover:text-night flex h-11 w-11 items-center justify-center transition-colors"
                aria-label="Vorheriger Monat"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button
                onClick={goToToday}
                className="semi-condensed text-primary-ink dark:text-primary hover:bg-ink hover:text-paper dark:hover:bg-night-text dark:hover:text-night flex h-11 items-center px-3 text-sm font-semibold transition-colors"
              >
                Heute
              </button>
              <button
                onClick={goToNextMonth}
                className="text-ink hover:bg-ink hover:text-paper dark:text-night-text dark:hover:bg-night-text dark:hover:text-night flex h-11 w-11 items-center justify-center transition-colors"
                aria-label="Nächster Monat"
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>

          {/* Wochentage */}
          <div className="mb-2 grid grid-cols-7 gap-1">
            {weekDays.map((day) => (
              <div
                key={day}
                className="semi-condensed text-dark dark:text-night-muted py-2 text-center text-xs font-semibold"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Tage */}
          <div className="grid grid-cols-7 gap-1">
            {/* Leere Zellen für Tage vor dem 1. */}
            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Tage des Monats */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const events = getEventsForDay(day);
              const courseStatus = getCourseStatusForDay(day);
              const hasEvents = events.length > 0;
              const hasOpenToParticipants = events.some(
                (e) => e.type === "event" && e.openToParticipants,
              );
              const hasCancelledEvent = events.some(
                (e) => e.type === "event" && e.cancelled,
              );
              const today = isToday(day);
              const selected = isSelected(day);

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(berlinDate(year, month, day))}
                  /*
                   * Die Schriftfarbe steht in jedem Zweig, nicht als Grundwert
                   * davor: `cn` und die Klassenliste entscheiden nichts, es
                   * gilt die Reihenfolge im Stylesheet. Ein vorangestelltes
                   * `dark:text-night-text` gewann deshalb gegen das
                   * `dark:text-night` des ausgewählten Tages — im Nachtdruck
                   * stand die helle Ziffer auf der hellen Fläche.
                   */
                  className={`relative flex aspect-square flex-col items-center justify-center transition-colors ${
                    selected
                      ? "bg-ink text-paper dark:bg-night-text dark:text-night font-bold"
                      : today
                        ? "text-ink dark:text-night-text bg-ink/[0.06] dark:bg-night-text/[0.08] font-bold"
                        : courseStatus
                          ? "text-ink dark:text-night-text bg-rule/20 dark:bg-night-rule/20"
                          : "text-ink dark:text-night-text hover:bg-rule/20 dark:hover:bg-night-rule/20"
                  }`}
                >
                  {/* Cancelled Indicator oben links */}
                  {hasCancelledEvent && (
                    <div
                      className={`absolute top-0.5 left-0.5 flex h-3 w-3 items-center justify-center ${
                        selected ? "bg-red-400" : "bg-red-700 dark:bg-red-400"
                      }`}
                      title="Abgesagt"
                    >
                      <XCircleIcon className="h-2 w-2 text-white" aria-hidden />
                    </div>
                  )}

                  {/* Mitmachangebot-Indicator oben rechts */}
                  {hasOpenToParticipants && (
                    <div
                      className={`absolute top-0.5 right-0.5 h-2 w-2 ${
                        selected ? "bg-paper dark:bg-night" : "bg-primary"
                      }`}
                      title="Mitmachangebot"
                    />
                  )}

                  {/* Multi-day course indicator */}
                  {courseStatus && (
                    <div
                      className={`absolute top-0 right-0 left-0 h-0.5 ${
                        selected
                          ? "bg-paper dark:bg-night"
                          : "bg-ink dark:bg-night-text"
                      }`}
                    />
                  )}

                  <span className="text-sm md:text-base">{day}</span>

                  {/* Event Indicators mit Bezirks-Farben */}
                  {hasEvents && (
                    <div className="absolute bottom-1 flex gap-0.5">
                      {events.slice(0, 3).map((event, idx) => {
                        const districtNumber = event.bezirk?.number;

                        return (
                          <div
                            key={idx}
                            className="h-1 w-1"
                            style={{
                              backgroundColor: selected
                                ? "#FFFFFF"
                                : getDistrictColor(districtNumber),
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legende */}
          <div className="border-rule dark:border-night-rule mt-4 border-t pt-4">
            <div className="text-dark dark:text-night-muted flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="bg-primary h-2.5 w-2.5"></div>
                <span>Mitspielen möglich</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-2.5 w-2.5 items-center justify-center bg-red-700 dark:bg-red-400">
                  <XIcon className="h-2 w-2 text-white" aria-hidden />
                </div>
                <span>Abgesagt</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-ink dark:bg-night-text h-0.5 w-3"></div>
                <span>Mehrtägige Veranstaltung</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Ende Mobile Kalender */}

      {/* Termine für den ausgewählten Tag - nur Mobile */}
      <div className="lg:hidden">
        <Heading as="h3" size="list" rule>
          {formatBerlin(
            selectedDate,
            selectedParts.year !== berlinParts(new Date()).year
              ? "datumMitWochentag"
              : { weekday: "long", day: "numeric", month: "long" },
          )}
        </Heading>

        {todayItems.length > 0 ? (
          <ProgrammeList
            entries={todayItems.map(toProgrammeEntry)}
            now={calendarNow}
          />
        ) : (
          <p className="text-dark dark:text-night-muted border-rule dark:border-night-rule border-b py-4 text-center text-sm">
            Keine Termine an diesem Tag
          </p>
        )}

        {/* Nächste Termine */}
        {upcomingItems.length > 0 && (
          <div className="mt-8">
            <Heading as="h4" size="list" className="text-[1.375rem]">
              Nächste Termine
            </Heading>
            <ProgrammeList
              entries={upcomingItems.map(toProgrammeEntry)}
              now={calendarNow}
            />
          </div>
        )}

        {todayItems.length === 0 && upcomingItems.length === 0 && (
          <p className="text-dark dark:text-night-muted py-8 text-center">
            Keine weiteren Termine geplant.
          </p>
        )}
      </div>
    </div>
  );
}
