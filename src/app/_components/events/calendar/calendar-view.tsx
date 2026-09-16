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

interface CalendarViewProps {
  items: CalendarItem[];
}

export default function CalendarView({ items }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const calendarNow = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

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

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

    return { daysInMonth, startingDayOfWeek, firstDay, lastDay };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);

  const getEventsForDay = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return calendarItems.filter((item) => {
      if (item.type === "course") {
        const course = item;
        const endDate = new Date(course.endDate);
        return item.date <= endOfDay && endDate >= startOfDay;
      }

      return item.date >= startOfDay && item.date <= endOfDay;
    });
  };

  const getCourseStatusForDay = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const courses = calendarItems.filter((item) => item.type === "course");

    for (const course of courses) {
      const startDate = course.date;
      const endDate = new Date(course.endDate);

      if (startDate >= startOfDay && startDate <= endOfDay) {
        return "start";
      }

      if (endDate >= startOfDay && endDate <= endOfDay) {
        return "end";
      }

      if (startDate < startOfDay && endDate > endOfDay) {
        return "ongoing";
      }
    }

    return null;
  };

  const getItemsForSelectedDay = () => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    return calendarItems
      .filter((item) => {
        if (item.type === "course") {
          const course = item;
          const endDate = new Date(course.endDate);
          return item.date <= endOfDay && endDate >= startOfDay;
        }

        return item.date >= startOfDay && item.date <= endOfDay;
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const getUpcomingItems = () => {
    const startOfNextDay = new Date(selectedDate);
    startOfNextDay.setDate(startOfNextDay.getDate() + 1);
    startOfNextDay.setHours(0, 0, 0, 0);

    return calendarItems
      .filter((item) => item.date >= startOfNextDay)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 10);
  };

  const todayItems = getItemsForSelectedDay();
  const upcomingItems = getUpcomingItems();

  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1),
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1),
    );
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  const monthName = currentMonth.toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });
  const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return (
      day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear()
    );
  };

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
                  onClick={() =>
                    setSelectedDate(
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth(),
                        day,
                      ),
                    )
                  }
                  className={`text-ink dark:text-night-text relative flex aspect-square flex-col items-center justify-center transition-colors ${
                    selected
                      ? "bg-ink text-paper dark:bg-night-text dark:text-night font-bold"
                      : today
                        ? "bg-ink/[0.06] dark:bg-night-text/[0.08] font-bold"
                        : courseStatus
                          ? "bg-rule/20 dark:bg-night-rule/20"
                          : "hover:bg-rule/20 dark:hover:bg-night-rule/20"
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
          {selectedDate.toLocaleDateString("de-DE", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year:
              selectedDate.getFullYear() !== new Date().getFullYear()
                ? "numeric"
                : undefined,
          })}
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
