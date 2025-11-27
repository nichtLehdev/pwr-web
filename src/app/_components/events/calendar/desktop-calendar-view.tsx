"use client";

import { useState, useMemo, useEffect } from "react";
import type {
  CalendarItem,
  CalendarEventItem,
  CalendarCourseItem,
} from "@/lib/types/calendar";
import { getDistrictColor } from "@/lib/district-color";
import EventDetailModal from "../event-detail-modal";

// Constants
const MAX_EVENTS_PER_DAY = 4;
const MAX_VISIBLE_WHEN_OVERFLOW = 3;
const MULTI_DAY_ROW_HEIGHT = 24;
const EVENT_START_TOP_WITHOUT_COURSES = 32;

// Helper functions stay the same
const getEventCategoryStyle = (category: string) => {
  switch (category) {
    case "KONZERT":
      return {
        borderClass: "border-2",
        bgOpacity: 0.2,
      };
    case "PROBE":
      return {
        borderClass: "border border-dashed",
        bgOpacity: 0.15,
      };
    case "GOTTESDIENST":
      return {
        borderClass: "border",
        bgOpacity: 0.15,
      };
    case "ANDERE":
    default:
      return {
        borderClass: "border border-dotted",
        bgOpacity: 0.1,
      };
  }
};

const hexToRgba = (hex: string, opacity: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// ✅ FIXED: Separate internal types for events and courses
type CalendarEventInternal = CalendarEventItem & {
  date: Date;
  endDate?: undefined; // Events don't have endDate
};

type CalendarCourseInternal = CalendarCourseItem & {
  date: Date;
  endDate: Date; // Courses always have endDate
};

type CalendarItemInternal = CalendarEventInternal | CalendarCourseInternal;

interface DesktopCalendarViewProps {
  items: CalendarItem[];
}

export default function DesktopCalendarView({
  items,
}: DesktopCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] =
    useState<CalendarItemInternal | null>(null);
  const [showMoreEventsDay, setShowMoreEventsDay] = useState<number | null>(
    null,
  );

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

  // ✅ FIXED: Properly map items with correct types
  const calendarItems = useMemo<CalendarItemInternal[]>(
    () =>
      items.map((item): CalendarItemInternal => {
        if (item.type === "event") {
          return {
            ...item,
            date: new Date(item.eventDate),
            endDate: undefined,
          };
        } else {
          return {
            ...item,
            date: new Date(item.startDate),
            endDate: new Date(item.endDate),
          };
        }
      }),
    [items],
  );

  // Calendar helper
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);

  // Get events for a day (only normal single-day events)
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

    return calendarItems.filter((item): item is CalendarEventInternal => {
      if (item.type === "event") {
        return item.date >= startOfDay && item.date <= endOfDay;
      }
      return false;
    });
  };

  // Collect all courses and assign them rows
  const courseRows = useMemo(() => {
    const courses = calendarItems.filter(
      (item): item is CalendarCourseInternal =>
        item.type === "course" && item.endDate !== undefined,
    );
    const rows: CalendarCourseInternal[][] = [];

    courses.forEach((course) => {
      let placed = false;
      for (let i = 0; i < rows.length; i++) {
        const hasOverlap =
          rows[i]?.some((existingCourse) => {
            const existingEnd = existingCourse.endDate;
            return !(
              course.endDate < existingCourse.date || course.date > existingEnd
            );
          }) ?? false;

        if (!hasOverlap) {
          if (!rows[i]) {
            rows[i] = [];
          }
          (rows[i] = rows[i] || []).push(course);
          placed = true;
          break;
        }
      }

      if (!placed) {
        rows.push([course]);
      }
    });

    return rows;
  }, [calendarItems]);

  // Check if course runs on this day and in which row
  const getCoursesForDay = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const coursesAtDay: Array<{
      course: CalendarCourseInternal;
      row: number;
      isStart: boolean;
      isEnd: boolean;
      isWeekStart: boolean;
    }> = [];

    courseRows.forEach((row, rowIndex) => {
      const course = row.find(
        (c) => c.date <= endOfDay && c.endDate >= startOfDay,
      );

      if (course) {
        const startDate = new Date(course.date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(course.endDate);
        endDate.setHours(0, 0, 0, 0);

        const isStart = startDate >= startOfDay && startDate <= endOfDay;
        const isEnd = endDate >= startOfDay && endDate <= endOfDay;

        const dayOfWeek = (date.getDay() + 6) % 7;
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

  // Create mappings for all weeks in the month
  // useMemo caches calculations for better performance
  const weekRowMappings = useMemo(() => {
    const mappings = new Map<number, Map<number, number>>();

    // Helper: Get courses for a day (inline to avoid dependencies)
    const getCoursesForDayInline = (day: number) => {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day,
      );
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const coursesAtDay: Array<{ row: number }> = [];

      courseRows.forEach((row, rowIndex) => {
        const course = row.find(
          (c) => c.date <= endOfDay && c.endDate! >= startOfDay,
        );

        if (course) {
          coursesAtDay.push({ row: rowIndex });
        }
      });

      return coursesAtDay;
    };

    // Iterate through all days and create mappings for each week
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day,
      );
      const dayOfWeek = (date.getDay() + 6) % 7; // Monday = 0
      const mondayDay = day - dayOfWeek;

      // If we don't have a mapping for this week yet
      if (mondayDay >= 1 && !mappings.has(mondayDay)) {
        // Collect all unique row numbers in this week
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

        // Create compact mapping for this week
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

  // Compact rows for a day: Remove empty rows at week start
  const getCompactCoursesForDay = (day: number) => {
    const coursesAtDay = getCoursesForDay(day);
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    const dayOfWeek = (date.getDay() + 6) % 7; // Monday = 0

    // Find Monday of this week
    const mondayDay = day - dayOfWeek;

    // Get mapping for this week
    const rowMapping = weekRowMappings.get(mondayDay);

    // If mapping exists, apply it
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
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1),
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1),
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

  const coursesWithTitleDisplayed = new Set<string>();

  return (
    <>
      <div className="overflow-hidden rounded-lg bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-dark text-2xl font-bold">{monthName}</h2>
          <div className="flex gap-2">
            <button
              onClick={goToPreviousMonth}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100"
              aria-label="Vorheriger Monat"
            >
              <svg
                className="h-5 w-5"
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
              className="text-primary hover:bg-primary/10 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
              aria-label="Zum heutigen Tag springen"
            >
              Heute
            </button>
            <button
              onClick={goToNextMonth}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100"
              aria-label="Nächster Monat"
            >
              <svg
                className="h-5 w-5"
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

        {/* Week days */}
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {weekDays.map((day) => (
            <div
              key={day}
              className="px-2 py-3 text-center text-sm font-semibold text-gray-600"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7" style={{ gridAutoRows: "150px" }}>
          {/* Empty cells */}
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

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const date = new Date(
              currentMonth.getFullYear(),
              currentMonth.getMonth(),
              day,
            );
            const dayOfWeek = (date.getDay() + 6) % 7;
            const isLastColumn = dayOfWeek === 6;
            const currentCellIndex = startingDayOfWeek + i;
            const currentRowIndex = Math.floor(currentCellIndex / 7);
            const isLastRow = currentRowIndex === lastRowIndex;
            const events = getEventsForDay(day);
            const today = isToday(day);
            const coursesAtDay = getCompactCoursesForDay(day);

            // Collect all events for this day (courses + normal events)
            const allEventsForDay = [
              ...coursesAtDay.map((c) => c.course),
              ...events,
            ];
            const totalEventsCount = allEventsForDay.length;
            const hasMoreThanLimit = totalEventsCount > MAX_EVENTS_PER_DAY;

            // Calculate highest row number used on this day
            const maxRowAtDay =
              coursesAtDay.length > 0
                ? Math.max(...coursesAtDay.map((c) => c.row)) + 1
                : 0;

            // Limit multi-day rows
            const limitedMaxRowAtDay = hasMoreThanLimit
              ? Math.min(maxRowAtDay, MAX_VISIBLE_WHEN_OVERFLOW)
              : Math.min(maxRowAtDay, MAX_EVENTS_PER_DAY);

            // Calculate available slots for normal events
            const availableSlotsForEvents = hasMoreThanLimit
              ? Math.max(0, MAX_VISIBLE_WHEN_OVERFLOW - limitedMaxRowAtDay)
              : Math.max(0, MAX_EVENTS_PER_DAY - limitedMaxRowAtDay);

            return (
              <div
                key={day}
                className={`relative ${!isLastColumn ? "border-r" : ""} ${
                  !isLastRow ? "border-b" : ""
                } ${today ? "bg-primary/5" : "hover:bg-gray-50"}`}
              >
                {/* Date */}
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
                  <span
                    className={`text-sm font-semibold ${
                      today
                        ? "bg-primary flex h-6 w-6 items-center justify-center rounded-full text-white"
                        : "text-gray-700"
                    }`}
                  >
                    {day}
                  </span>
                </div>

                {/* Multi-day course bars */}
                <div className="absolute top-8 right-0 left-0">
                  {Array.from({ length: limitedMaxRowAtDay }).map(
                    (_, rowIndex) => {
                      const courseData = coursesAtDay.find(
                        (c) => c.row === rowIndex,
                      );

                      if (!courseData) {
                        return <div key={rowIndex} className="mb-1 h-5" />;
                      }

                      const { course, isStart, isEnd, isWeekStart } =
                        courseData;
                      const courseId = course.id;
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
                      const districtColor = getDistrictColor(
                        course.bezirk?.number,
                      );

                      return (
                        <div
                          key={rowIndex}
                          className={`mb-1 h-5 cursor-pointer truncate py-0.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 ${
                            isStart && isEnd
                              ? "mx-2 rounded px-2"
                              : isStart
                                ? "-mr-px ml-2 rounded-l pr-0 pl-2"
                                : isEnd
                                  ? "mr-2 -ml-px rounded-r pr-2 pl-0"
                                  : "-mx-px pr-0 pl-0"
                          }`}
                          style={{
                            backgroundColor: districtColor,
                          }}
                          onClick={() => setSelectedEvent(course)}
                          title={course.title}
                        >
                          {showTitle && (
                            <span className="pl-2">
                              {showTitle ? course.title : "\u00A0"}
                            </span>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>

                {/* Events (no courses) */}
                {(() => {
                  const normalEvents = events.filter((e) => e.type === "event");
                  const displayedEvents = normalEvents.slice(
                    0,
                    availableSlotsForEvents,
                  );

                  const displayedCount =
                    limitedMaxRowAtDay + displayedEvents.length;

                  return (
                    <>
                      <div
                        className="absolute right-2 left-2"
                        style={{
                          top: `${
                            EVENT_START_TOP_WITHOUT_COURSES +
                            limitedMaxRowAtDay * MULTI_DAY_ROW_HEIGHT
                          }px`,
                        }}
                      >
                        <div className="space-y-1">
                          {displayedEvents.map((event, idx) => {
                            const time = event.date.toLocaleTimeString(
                              "de-DE",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            );
                            const categoryStyle = getEventCategoryStyle(
                              event.category,
                            );
                            const hasOpenToParticipants =
                              event.openToParticipants;
                            const districtColor = getDistrictColor(
                              event.bezirk?.number,
                            );

                            return (
                              <button
                                key={idx}
                                onClick={() => setSelectedEvent(event)}
                                className={`flex w-full cursor-pointer items-center gap-1 truncate rounded px-2 py-0.5 text-left text-[11px] font-medium text-gray-900 transition-all hover:brightness-95 ${categoryStyle.borderClass}`}
                                style={{
                                  backgroundColor: hexToRgba(
                                    districtColor,
                                    categoryStyle.bgOpacity,
                                  ),
                                  borderColor: districtColor,
                                }}
                                title={`${time} ${event.title}`}
                              >
                                {hasOpenToParticipants && (
                                  <svg
                                    className="h-3 w-3 shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    style={{ color: districtColor }}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                    />
                                  </svg>
                                )}
                                <span className="truncate">
                                  {time} {event.title}
                                </span>
                              </button>
                            );
                          })}

                          {hasMoreThanLimit && (
                            <button
                              onClick={() => setShowMoreEventsDay(day)}
                              className="text-primary hover:bg-primary/10 w-full rounded px-2 py-1 text-left text-[11px] font-medium transition-colors"
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

      {/* Legend */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-md">
        <h3 className="mb-3 text-sm font-bold text-gray-900">Legende</h3>
        <div className="grid grid-cols-1 gap-3 text-xs text-gray-600 md:grid-cols-2">
          <div className="flex items-center gap-2">
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span>= Mitspielen möglich</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-8 rounded border-2 border-blue-500 bg-blue-500/20"></div>
            <span>Konzert (dicker Rand)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-8 rounded border border-blue-500 bg-blue-500/15"></div>
            <span>Gottesdienst (dünner Rand)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-8 rounded border border-dashed border-blue-500 bg-blue-500/15"></div>
            <span>Probe (gestrichelt)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-8 rounded border border-dotted border-blue-500 bg-blue-500/10"></div>
            <span>Sonstiges (gepunktet)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-primary h-3 w-8 rounded"></div>
            <span>Mehrtägige Veranstaltung</span>
          </div>
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
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => setShowMoreEventsDay(null)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="more-events-title"
            >
              <div
                className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b p-4">
                  <h3
                    id="more-events-title"
                    className="text-dark text-lg font-bold"
                  >
                    Events am {day}.{" "}
                    {currentMonth.toLocaleDateString("de-DE", {
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                  <button
                    onClick={() => setShowMoreEventsDay(null)}
                    className="rounded p-1 transition-colors hover:bg-gray-100"
                    aria-label="Modal schließen"
                  >
                    <svg
                      className="h-5 w-5"
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

                <div className="max-h-[calc(80vh-80px)] space-y-2 overflow-y-auto p-4">
                  {allEventsForDay.map((item, idx) => {
                    const isCourse = item.type === "course";
                    const districtColor = getDistrictColor(item.bezirk?.number);

                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedEvent(item);
                          setShowMoreEventsDay(null);
                        }}
                        className="w-full rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50"
                        style={{
                          borderLeftWidth: "4px",
                          borderLeftColor: districtColor,
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-dark flex-1 font-semibold">
                            {item.title}
                          </div>
                          {!isCourse &&
                            item.type === "event" &&
                            item.openToParticipants && (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-600">
                                <svg
                                  className="h-2.5 w-2.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                  />
                                </svg>
                                Mitspielen
                              </span>
                            )}
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          {isCourse ? (
                            <>
                              {item.date.toLocaleDateString("de-DE")} -{" "}
                              {item.endDate?.toLocaleDateString("de-DE")}
                              <span className="bg-primary/10 text-primary ml-2 rounded px-2 py-0.5 text-xs">
                                Lehrgang
                              </span>
                            </>
                          ) : (
                            <>
                              {item.date.toLocaleTimeString("de-DE", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                                {item.type === "event" && item.category}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {item.bezirk?.name || ""}
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
