"use client";

import { useState, useMemo, useEffect } from "react";
import { getDistrictColor } from "@/lib/districtColors";
import EventDetailModal from "./EventDetailModal";
import type { Event, Course } from "@/types/strapi";

// Konstanten
const MAX_EVENTS_PER_DAY = 4;
const MAX_VISIBLE_WHEN_OVERFLOW = 3;
const MULTI_DAY_ROW_HEIGHT = 24; // px
const EVENT_START_TOP_WITHOUT_COURSES = 32; // px

interface CalendarItem {
  type: "event" | "course";
  data: Event | Course;
  date: Date;
  endDate?: Date;
}

interface DesktopCalendarViewProps {
  items: Array<{ type: "event" | "course" } & (Event | Course)>;
}

export default function DesktopCalendarView({
  items,
}: DesktopCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarItem | null>(null);
  const [showMoreEventsDay, setShowMoreEventsDay] = useState<number | null>(
    null
  );

  // ESC-Taste zum Schließen des Modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showMoreEventsDay !== null) {
          setShowMoreEventsDay(null);
        }
      }
    };

    if (showMoreEventsDay !== null) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [showMoreEventsDay]);

  // Parse items zu CalendarItems (mit useMemo für Performance)
  const calendarItems = useMemo<CalendarItem[]>(
    () =>
      items.map((item) => ({
        type: item.type,
        data: item as any,
        date: new Date(
          item.type === "event"
            ? (item as any).eventDate
            : (item as any).startDate
        ),
        endDate:
          item.type === "course" ? new Date((item as any).endDate) : undefined,
      })),
    [items]
  );

  // Kalender-Helper
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Montag = 0

    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);

  // Events für einen Tag (nur normale single-day Events)
  const getEventsForDay = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return calendarItems.filter((item) => {
      // Nur Single-Day Events (keine Courses)
      if (item.type === "event") {
        return item.date >= startOfDay && item.date <= endOfDay;
      }
      return false;
    });
  };

  // Sammle alle Courses und weise ihnen Zeilen zu (für Stacking)
  // useMemo verhindert unnötige Neuberechnungen bei Re-Renders
  const courseRows = useMemo(() => {
    const courses = calendarItems.filter(
      (item) => item.type === "course" && item.endDate
    );
    const rows: CalendarItem[][] = [];

    courses.forEach((course) => {
      // Finde erste Zeile wo der Course reinpasst (keine Überlappung)
      let placed = false;
      for (let i = 0; i < rows.length; i++) {
        const hasOverlap = rows[i].some((existingCourse) => {
          const existingEnd = existingCourse.endDate!;
          return !(
            course.endDate! < existingCourse.date || course.date > existingEnd
          );
        });

        if (!hasOverlap) {
          rows[i].push(course);
          placed = true;
          break;
        }
      }

      // Wenn keine passende Zeile gefunden, neue Zeile erstellen
      if (!placed) {
        rows.push([course]);
      }
    });

    return rows;
  }, [calendarItems]);

  // Prüfe ob Course an diesem Tag läuft und in welcher Zeile
  const getCoursesForDay = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const coursesAtDay: Array<{
      course: CalendarItem;
      row: number;
      isStart: boolean;
      isEnd: boolean;
      isWeekStart: boolean;
    }> = [];

    courseRows.forEach((row, rowIndex) => {
      const course = row.find(
        (c) => c.date <= endOfDay && c.endDate! >= startOfDay
      );

      if (course) {
        const startDate = new Date(course.date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(course.endDate!);
        endDate.setHours(0, 0, 0, 0);

        const isStart = startDate >= startOfDay && startDate <= endOfDay;
        const isEnd = endDate >= startOfDay && endDate <= endOfDay;

        // Prüfe ob es Wochenbeginn ist (Montag) und Course läuft schon
        const dayOfWeek = (date.getDay() + 6) % 7; // Montag = 0
        const isWeekStart = dayOfWeek === 0 && startDate < startOfDay;

        coursesAtDay.push({
          course,
          row: rowIndex,
          isStart,
          isEnd,
          isWeekStart,
        });
      }
    });

    return coursesAtDay;
  };

  // Erstelle Mappings für alle Wochen im Monat
  // useMemo cached die Berechnungen für bessere Performance
  const weekRowMappings = useMemo(() => {
    const mappings = new Map<number, Map<number, number>>();

    // Helper: Hole Courses für einen Tag (inline um Dependencies zu vermeiden)
    const getCoursesForDayInline = (day: number) => {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day
      );
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const coursesAtDay: Array<{ row: number }> = [];

      courseRows.forEach((row, rowIndex) => {
        const course = row.find(
          (c) => c.date <= endOfDay && c.endDate! >= startOfDay
        );

        if (course) {
          coursesAtDay.push({ row: rowIndex });
        }
      });

      return coursesAtDay;
    };

    // Iteriere durch alle Tage und erstelle Mappings für jede Woche
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day
      );
      const dayOfWeek = (date.getDay() + 6) % 7; // Montag = 0
      const mondayDay = day - dayOfWeek;

      // Wenn wir noch kein Mapping für diese Woche haben
      if (mondayDay >= 1 && !mappings.has(mondayDay)) {
        // Sammle alle unique Row-Nummern in dieser Woche
        const rowsInWeek = new Set<number>();

        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const currentDay = mondayDay + dayOffset;
          if (currentDay >= 1 && currentDay <= daysInMonth) {
            const coursesAtDay = getCoursesForDayInline(currentDay);
            coursesAtDay.forEach((courseData) => {
              rowsInWeek.add(courseData.row);
            });
          }
        }

        // Erstelle kompaktes Mapping für diese Woche
        const sortedRows = Array.from(rowsInWeek).sort((a, b) => a - b);
        const weekMapping = new Map<number, number>();
        sortedRows.forEach((originalRow, index) => {
          weekMapping.set(originalRow, index);
        });

        mappings.set(mondayDay, weekMapping);
      }
    }

    return mappings;
  }, [currentMonth, daysInMonth, courseRows]);

  // Kompaktiere Rows für einen Tag: Entferne leere Rows am Wochenbeginn
  const getCompactCoursesForDay = (day: number) => {
    const coursesAtDay = getCoursesForDay(day);
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    const dayOfWeek = (date.getDay() + 6) % 7; // Montag = 0

    // Finde Montag dieser Woche
    const mondayDay = day - dayOfWeek;

    // Hole das Mapping für diese Woche
    const rowMapping = weekRowMappings.get(mondayDay);

    // Wenn ein Mapping existiert, wende es an
    if (rowMapping) {
      return coursesAtDay.map((courseData) => ({
        ...courseData,
        row: rowMapping.get(courseData.row) ?? courseData.row,
      }));
    }

    return coursesAtDay;
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const monthName = currentMonth.toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });
  const weekDays = [
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
    "Sonntag",
  ];

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const lastRowIndex = Math.ceil((startingDayOfWeek + daysInMonth) / 7) - 1;

  const coursesWithTitleDisplayed = new Set<number>();

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-2xl font-bold text-dark">{monthName}</h2>
          <div className="flex gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Vorheriger Monat"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors"
              aria-label="Zum heutigen Tag springen"
            >
              Heute
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Nächster Monat"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Wochentage */}
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-semibold text-gray-600 py-3 px-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Kalender Grid */}
        <div className="grid grid-cols-7" style={{ gridAutoRows: "140px" }}>
          {/* Leere Zellen */}
          {Array.from({ length: startingDayOfWeek }).map((_, i) => {
            const isLastColumn = i === 6;
            const isLastRow = 0 === lastRowIndex;

            return (
              <div
                key={`empty-${i}`}
                className={`bg-gray-50/50 ${!isLastColumn ? "border-r" : ""} ${
                  !isLastRow ? "border-b" : ""
                }`}
              ></div>
            );
          })}

          {/* Tage */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const date = new Date(
              currentMonth.getFullYear(),
              currentMonth.getMonth(),
              day
            );
            const dayOfWeek = (date.getDay() + 6) % 7;
            const isLastColumn = dayOfWeek === 6;
            const currentCellIndex = startingDayOfWeek + i;
            const currentRowIndex = Math.floor(currentCellIndex / 7);
            const isLastRow = currentRowIndex === lastRowIndex;
            const events = getEventsForDay(day);
            const today = isToday(day);
            const coursesAtDay = getCompactCoursesForDay(day);

            // Sammle alle Events für diesen Tag (Courses + normale Events)
            const allEventsForDay = [
              ...coursesAtDay.map((c) => c.course),
              ...events,
            ];
            const totalEventsCount = allEventsForDay.length;
            const hasMoreThanLimit = totalEventsCount > MAX_EVENTS_PER_DAY;

            // Berechne die höchste Row-Nummer die an diesem Tag verwendet wird
            // Dies bestimmt die Höhe der Multi-Day Event Section
            const maxRowAtDay =
              coursesAtDay.length > 0
                ? Math.max(...coursesAtDay.map((c) => c.row)) + 1
                : 0;

            // WICHTIG: Wenn mehr als MAX_EVENTS_PER_DAY Events, zeige nur MAX_VISIBLE_WHEN_OVERFLOW sichtbare + "x weitere" Button
            // Begrenze Multi-Day Rows auf max MAX_VISIBLE_WHEN_OVERFLOW wenn es zu viele Events gibt
            const limitedMaxRowAtDay = hasMoreThanLimit
              ? Math.min(maxRowAtDay, MAX_VISIBLE_WHEN_OVERFLOW)
              : Math.min(maxRowAtDay, MAX_EVENTS_PER_DAY);

            // Berechne verfügbare Slots für normale Events
            const availableSlotsForEvents = hasMoreThanLimit
              ? Math.max(0, MAX_VISIBLE_WHEN_OVERFLOW - limitedMaxRowAtDay) // Bei >MAX_EVENTS_PER_DAY: max MAX_VISIBLE_WHEN_OVERFLOW gesamt
              : Math.max(0, MAX_EVENTS_PER_DAY - limitedMaxRowAtDay); // Sonst: MAX_EVENTS_PER_DAY - Multi-Day Rows

            return (
              <div
                key={day}
                className={`relative ${!isLastColumn ? "border-r" : ""} ${
                  !isLastRow ? "border-b" : ""
                } ${today ? "bg-primary/5" : "hover:bg-gray-50"}`}
              >
                {/* Datum */}
                <div className="absolute top-2 left-2 z-10">
                  <span
                    className={`text-sm font-semibold ${
                      today
                        ? "text-white bg-primary rounded-full w-6 h-6 flex items-center justify-center"
                        : "text-gray-700"
                    }`}
                  >
                    {day}
                  </span>
                </div>

                {/* Multi-day course bars - absolute positioning für seamless bars */}
                <div className="absolute top-8 left-0 right-0">
                  {/* Erstelle Platzhalter für alle Rows bis limitedMaxRowAtDay (max 4) */}
                  {Array.from({ length: limitedMaxRowAtDay }).map(
                    (_, rowIndex) => {
                      const courseData = coursesAtDay.find(
                        (c) => c.row === rowIndex
                      );

                      if (!courseData) {
                        // Leere Row für Spacing (damit andere Courses auf gleicher Höhe bleiben)
                        return <div key={rowIndex} className="h-5 mb-1" />;
                      }

                      const { course, isStart, isEnd, isWeekStart } =
                        courseData;
                      const eventData = course.data as any;
                      const courseId = eventData.id as number;
                      const hasTitleBeenDisplayed =
                        coursesWithTitleDisplayed.has(courseId);
                      let shouldShowTitle = false;

                      if (isStart && !hasTitleBeenDisplayed) {
                        shouldShowTitle = true;
                      } else if (
                        !isStart &&
                        !isWeekStart &&
                        !hasTitleBeenDisplayed
                      ) {
                        shouldShowTitle = true;
                      }

                      if (shouldShowTitle) {
                        coursesWithTitleDisplayed.add(courseId);
                      }

                      const showTitle = shouldShowTitle || isWeekStart;

                      return (
                        <div
                          key={rowIndex}
                          className={`h-5 mb-1 text-[11px] font-semibold text-white py-0.5 truncate cursor-pointer hover:opacity-90 transition-opacity ${
                            isStart && isEnd
                              ? "rounded mx-2 px-2" // Single day: voller Margin
                              : isStart
                              ? "rounded-l ml-2 pl-2 pr-0 -mr-px" // Start: nur links Margin
                              : isEnd
                              ? "rounded-r mr-2 pr-2 pl-0 -ml-px" // Ende: nur rechts Margin
                              : "pl-0 pr-0 -mx-px" // Mitte: kein Margin, überlappend
                          }`}
                          style={{
                            backgroundColor: getDistrictColor(
                              eventData.districtInfo.name
                            ),
                          }}
                          onClick={() => setSelectedEvent(course)}
                          title={eventData.title}
                        >
                          {showTitle && (
                            <span className="pl-2">
                              {showTitle ? eventData.title : "\u00A0"}
                            </span>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>

                {/* Events (keine Courses) - unterhalb der Course-Bars */}
                {(() => {
                  const normalEvents = events.filter((e) => e.type === "event");
                  const displayedEvents = normalEvents.slice(
                    0,
                    availableSlotsForEvents
                  );

                  // Berechne die Anzahl der tatsächlich angezeigten Events
                  const displayedCount =
                    limitedMaxRowAtDay + displayedEvents.length;

                  return (
                    <>
                      {/* Normale Events und "weitere Events" Button */}
                      <div
                        className="absolute left-2 right-2"
                        style={{
                          top: `${
                            EVENT_START_TOP_WITHOUT_COURSES +
                            limitedMaxRowAtDay * MULTI_DAY_ROW_HEIGHT
                          }px`,
                        }}
                      >
                        <div className="space-y-1">
                          {displayedEvents.map((event, idx) => {
                            const eventData = event.data as any;
                            const time = event.date.toLocaleTimeString(
                              "de-DE",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            );

                            return (
                              <button
                                key={idx}
                                onClick={() => setSelectedEvent(event)}
                                className="w-full text-left text-[11px] px-2 py-1 rounded truncate hover:opacity-90 transition-opacity text-white font-medium"
                                style={{
                                  backgroundColor: getDistrictColor(
                                    eventData.districtInfo.name
                                  ),
                                }}
                                title={`${time} ${eventData.title}`}
                              >
                                {time} {eventData.title}
                              </button>
                            );
                          })}

                          {/* "X weitere Events" Button - nach den Events mit spacing */}
                          {hasMoreThanLimit && (
                            <button
                              onClick={() => setShowMoreEventsDay(day)}
                              className="w-full text-left text-[11px] px-2 py-1 text-primary hover:bg-primary/10 rounded transition-colors font-medium"
                            >
                              +{totalEventsCount - displayedCount} weitere
                              Events
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {/* More Events Modal */}
      {showMoreEventsDay !== null &&
        (() => {
          const day = showMoreEventsDay;
          const events = getEventsForDay(day);
          const coursesAtDay = getCoursesForDay(day);
          const allEventsForDay = [
            ...coursesAtDay.map((c) => c.course),
            ...events,
          ];

          return (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowMoreEventsDay(null)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="more-events-title"
            >
              <div
                className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b flex items-center justify-between">
                  <h3
                    id="more-events-title"
                    className="text-lg font-bold text-dark"
                  >
                    Events am {day}.{" "}
                    {currentMonth.toLocaleDateString("de-DE", {
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                  <button
                    onClick={() => setShowMoreEventsDay(null)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    aria-label="Modal schließen"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-4 space-y-2">
                  {allEventsForDay.map((item, idx) => {
                    const eventData = item.data as any;
                    const isCourse = item.type === "course";

                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedEvent(item);
                          setShowMoreEventsDay(null);
                        }}
                        className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
                        style={{
                          borderLeftWidth: "4px",
                          borderLeftColor: getDistrictColor(
                            eventData.districtInfo.name
                          ),
                        }}
                      >
                        <div className="font-semibold text-dark">
                          {eventData.title}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {isCourse ? (
                            <>
                              {item.date.toLocaleDateString("de-DE")} -{" "}
                              {item.endDate?.toLocaleDateString("de-DE")}
                              <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                Lehrgang
                              </span>
                            </>
                          ) : (
                            <>
                              {item.date.toLocaleTimeString("de-DE", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              <span className="ml-2 text-xs bg-secondary/10 text-secondary px-2 py-0.5 rounded">
                                Event
                              </span>
                            </>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {eventData.districtInfo.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
    </>
  );
}
