/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import CompactEventCard from "../event-card-compact";
import { getDistrictColor } from "@/lib/district-color";
import type { CalendarItem } from "@/lib/types/calendar";
import { ChevronLeft, ChevronRight, XCircleIcon, XIcon } from "lucide-react";

interface CalendarViewProps {
  items: CalendarItem[];
}

export default function CalendarView({ items }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

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
        <div className="bg-background-secondary dark:bg-dark-surface dark:shadow-dark-border rounded-lg p-4 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-dark text-xl font-bold dark:text-white">
              {monthName}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={goToPreviousMonth}
                className="dark:hover:bg-dark-background rounded-lg p-2 transition-colors hover:bg-gray-100"
                aria-label="Vorheriger Monat"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={goToToday}
                className="text-primary hover:bg-primary/10 rounded-lg px-3 py-1 text-sm font-semibold transition-colors"
              >
                Heute
              </button>
              <button
                onClick={goToNextMonth}
                className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Nächster Monat"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Wochentage */}
          <div className="mb-2 grid grid-cols-7 gap-1">
            {weekDays.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-300"
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
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-lg transition-colors dark:text-white ${
                    selected
                      ? "bg-primary font-bold text-white"
                      : today
                        ? "bg-primary/20 text-primary font-bold"
                        : courseStatus
                          ? "bg-primary/5"
                          : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {/* Cancelled Indicator oben links */}
                  {hasCancelledEvent && (
                    <div
                      className={`absolute top-0.5 left-0.5 flex h-3 w-3 items-center justify-center rounded-full ${
                        selected ? "bg-red-300" : "bg-red-500"
                      } shadow-sm`}
                      title="Abgesagt"
                    >
                      <XCircleIcon
                        className="h-2 w-2 text-white"
                      />
                    </div>
                  )}

                  {/* Mitmachangebot-Indicator oben rechts */}
                  {hasOpenToParticipants && (
                    <div
                      className={`absolute top-0.5 right-0.5 h-2 w-2 rounded-full ${
                        selected ? "bg-green-300" : "bg-green-500"
                      } shadow-sm`}
                      title="Mitmachangebot"
                    />
                  )}

                  {/* Multi-day course indicator */}
                  {courseStatus && (
                    <div
                      className={`absolute top-0 right-0 left-0 h-0.5 ${
                        selected ? "bg-white dark:bg-[#1a1614]" : "bg-primary"
                      } ${
                        courseStatus === "start"
                          ? "rounded-l-full"
                          : courseStatus === "end"
                            ? "rounded-r-full"
                            : ""
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
                            className="h-1 w-1 rounded-full"
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
          <div className="dark:border-dark-border mt-4 border-t border-gray-200 pt-4">
            <div className="flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <span>Mitspielen möglich</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-3 w-3 items-center justify-center rounded-full bg-red-500">
                  <XIcon
                    className="h-2 w-2 text-white"
                  />
                </div>
                <span>Abgesagt</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-primary h-0.5 w-3 rounded-full"></div>
                <span>Mehrtägige Veranstaltung</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Ende Mobile Kalender */}

      {/* Events für den ausgewählten Tag - nur Mobile */}
      <div className="lg:hidden">
        <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-bold">
          {selectedDate.toLocaleDateString("de-DE", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year:
              selectedDate.getFullYear() !== new Date().getFullYear()
                ? "numeric"
                : undefined,
          })}
        </h3>

        {todayItems.length > 0 ? (
          <div className="mb-6 space-y-2">
            {todayItems.map((item, idx) => (
              <CompactEventCard
                key={`today-${item.type}-${item.id}-${idx}`}
                id={item.id}
                title={item.title}
                date={item.type === "event" ? item.eventDate : item.startDate}
                endDate={item.type === "course" ? item.endDate : undefined}
                location={item.location?.city || ""}
                category={
                  item.type === "event" ? item.category : item.courseType
                }
                type={item.type}
                openToParticipants={
                  item.type === "event" ? item.openToParticipants : undefined
                }
                cancelled={item.type === "event" ? item.cancelled : undefined}
              />
            ))}
          </div>
        ) : (
          <p className="bg-background-secondary dark:bg-dark-background-secondary text-dark dark:text-dark-text mb-6 rounded-lg py-4 text-center text-sm">
            Keine Termine an diesem Tag
          </p>
        )}

        {/* Nächste Termine */}
        {upcomingItems.length > 0 && (
          <>
            <h4 className="text-dark dark:text-dark-text mt-6 mb-3 text-base font-bold">
              Nächste Termine
            </h4>
            <div className="space-y-2">
              {upcomingItems.map((item, idx) => (
                <CompactEventCard
                  key={`upcoming-${item.type}-${item.id}-${idx}`}
                  id={item.id}
                  title={item.title}
                  date={item.type === "event" ? item.eventDate : item.startDate}
                  endDate={item.type === "course" ? item.endDate : undefined}
                  location={item.location?.city || ""}
                  category={
                    item.type === "event" ? item.category : item.courseType
                  }
                  type={item.type}
                  openToParticipants={
                    item.type === "event" ? item.openToParticipants : undefined
                  }
                  cancelled={item.type === "event" ? item.cancelled : undefined}
                />
              ))}
            </div>
          </>
        )}

        {todayItems.length === 0 && upcomingItems.length === 0 && (
          <p className="py-8 text-center text-gray-600 dark:text-gray-300">
            Keine weiteren Termine geplant.
          </p>
        )}
      </div>
    </div>
  );
}
