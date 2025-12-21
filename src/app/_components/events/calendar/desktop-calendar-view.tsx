"use client";

import { useState, useMemo, useEffect } from "react";
import type {
  CalendarItem,
  CalendarEventItem,
  CalendarCourseItem,
} from "@/lib/types/calendar";
import { getDistrictColor } from "@/lib/district-color";
import { getHolidaysForMonth, type Holiday } from "@/lib/holidays";
import EventDetailModal from "../event-detail-modal";
import MoreEventsModal from "./more-events-modal";
import HolidayModal from "./holiday-modal";

const MAX_EVENTS_PER_DAY = 4;
const MAX_VISIBLE_WHEN_OVERFLOW = 3;
const MULTI_DAY_ROW_HEIGHT = 24;
const EVENT_START_TOP_WITHOUT_COURSES = 36;

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

const getEventBackgroundStyle = (
  districtColor: string,
  bgOpacity: number,
  isDarkMode: boolean,
) => {
  const adjustedOpacity = isDarkMode ? Math.min(bgOpacity * 2, 0.4) : bgOpacity;
  return hexToRgba(districtColor, adjustedOpacity);
};

export type CalendarEventInternal = CalendarEventItem & {
  date: Date;
  endDate?: undefined;
};

export type CalendarCourseInternal = CalendarCourseItem & {
  date: Date;
  endDate: Date;
};

export type CalendarItemInternal =
  | CalendarEventInternal
  | CalendarCourseInternal;

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
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

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

  const holidaysThisMonth = useMemo(
    () =>
      getHolidaysForMonth(currentMonth.getFullYear(), currentMonth.getMonth()),
    [currentMonth],
  );

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

  const weekRowMappings = useMemo(() => {
    const mappings = new Map<number, Map<number, number>>();

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

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day,
      );
      const dayOfWeek = (date.getDay() + 6) % 7;
      const mondayDay = day - dayOfWeek;

      if (mondayDay >= 1 && !mappings.has(mondayDay)) {
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

  const getCompactCoursesForDay = (day: number) => {
    const coursesAtDay = getCoursesForDay(day);
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    const dayOfWeek = (date.getDay() + 6) % 7;

    const mondayDay = day - dayOfWeek;

    const rowMapping = weekRowMappings.get(mondayDay);

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
      <div className="dark:shadow-dark-border bg-background-secondary dark:bg-dark-surface overflow-hidden rounded-lg shadow-lg">
        {/* Header */}
        <div className="dark:border-dark-border flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-dark text-2xl font-bold dark:text-white">
            {monthName}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={goToPreviousMonth}
              className="text-dark dark:text-dark-text rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
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
              className="text-dark dark:text-dark-text rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
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
        <div className="dark:border-dark-border bg-background-tertiary dark:bg-dark-background-secondary grid grid-cols-7 border-b border-gray-200">
          {weekDays.map((day) => (
            <div
              key={day}
              className="px-2 py-3 text-center text-sm font-semibold text-gray-600 dark:text-gray-300"
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
                className={`bg-background-tertiary dark:bg-dark-background-secondary opacity-50 ${!isLastColumn ? "dark:border-dark-border border-r border-gray-200" : ""} ${
                  !isLastRow
                    ? "dark:border-dark-border border-b border-gray-200"
                    : ""
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
            const holiday = holidaysThisMonth.find(
              (h) => h.date.getDate() === day,
            );

            const allEventsForDay = [
              ...coursesAtDay.map((c) => c.course),
              ...events,
            ];
            const totalEventsCount = allEventsForDay.length;
            const hasMoreThanLimit = totalEventsCount > MAX_EVENTS_PER_DAY;

            const maxRowAtDay =
              coursesAtDay.length > 0
                ? Math.max(...coursesAtDay.map((c) => c.row)) + 1
                : 0;

            const limitedMaxRowAtDay = hasMoreThanLimit
              ? Math.min(maxRowAtDay, MAX_VISIBLE_WHEN_OVERFLOW)
              : Math.min(maxRowAtDay, MAX_EVENTS_PER_DAY);

            const availableSlotsForEvents = hasMoreThanLimit
              ? Math.max(0, MAX_VISIBLE_WHEN_OVERFLOW - limitedMaxRowAtDay)
              : Math.max(0, MAX_EVENTS_PER_DAY - limitedMaxRowAtDay);

            return (
              <div
                key={day}
                className={`relative ${!isLastColumn ? "dark:border-dark-border border-r border-gray-200" : ""} ${
                  !isLastRow
                    ? "dark:border-dark-border border-b border-gray-200"
                    : ""
                } ${
                  today
                    ? "bg-primary/5 dark:bg-primary/10"
                    : "dark:hover:bg-dark-background-secondary hover:bg-gray-50"
                }`}
              >
                {/* Date */}
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
                  <span
                    className={`text-sm font-semibold ${
                      today
                        ? "bg-primary flex h-6 w-6 items-center justify-center rounded-full text-white"
                        : "text-gray-700 dark:text-gray-200"
                    }`}
                  >
                    {day}
                  </span>
                  {holiday && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedHoliday(holiday);
                      }}
                      className="text-amber-600 transition-transform hover:scale-125 dark:text-amber-400"
                      title={holiday.name}
                      aria-label={`Details zu ${holiday.name}`}
                    >
                      {holiday.icon}
                    </button>
                  )}
                </div>

                {/* Multi-day course bars */}
                <div className="absolute top-9 right-0 left-0">
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
                            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
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
                            const isCancelled = event.cancelled;
                            const districtColor = getDistrictColor(
                              event.bezirk?.number,
                            );

                            return (
                              <button
                                key={idx}
                                onClick={() => setSelectedEvent(event)}
                                className={`flex w-full cursor-pointer items-center gap-1 truncate rounded px-2 py-0.5 text-left text-[11px] font-medium transition-all hover:brightness-95 ${
                                  isCancelled
                                    ? "border-2 border-red-500 bg-red-100 text-gray-500 line-through dark:bg-red-900/30 dark:text-gray-400"
                                    : `text-dark dark:text-dark-text ${categoryStyle.borderClass}`
                                }`}
                                style={
                                  isCancelled
                                    ? {}
                                    : {
                                        backgroundColor:
                                          getEventBackgroundStyle(
                                            districtColor,
                                            categoryStyle.bgOpacity,
                                            isDarkMode,
                                          ),
                                        borderColor: districtColor,
                                      }
                                }
                                title={`${isCancelled ? "[ABGESAGT] " : ""}${time} ${event.title}`}
                              >
                                {isCancelled && (
                                  <svg
                                    className="h-3 w-3 shrink-0 text-red-500"
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
                                )}
                                {!isCancelled && hasOpenToParticipants && (
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
      <div className="dark:border-dark-border dark:shadow-dark-border bg-background-secondary dark:bg-dark-surface mt-6 rounded-lg border border-gray-200 p-4 shadow-md">
        <h3 className="text-dark dark:text-dark-text mb-3 text-sm font-bold">
          Legende
        </h3>
        <div className="grid grid-cols-1 gap-3 text-xs text-gray-600 md:grid-cols-2 dark:text-gray-300">
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
            <div className="flex h-3 w-8 items-center justify-center rounded border-2 border-red-500 bg-red-100 dark:bg-red-900/30">
              <svg
                className="h-2.5 w-2.5 text-red-500"
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
            </div>
            <span>Abgesagt</span>
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
          <div className="flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l-2 4h1l-2 4h1l-3 6h4v6h4v-6h4l-3-6h1l-2-4h1l-2-4z" />
              </svg>
            </span>
            <span>Feiertag</span>
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
      {showMoreEventsDay !== null && (
        <MoreEventsModal
          day={showMoreEventsDay}
          currentMonth={currentMonth}
          events={[
            ...getCoursesForDay(showMoreEventsDay).map((c) => c.course),
            ...getEventsForDay(showMoreEventsDay),
          ]}
          onClose={() => setShowMoreEventsDay(null)}
          onSelectEvent={(event) => setSelectedEvent(event)}
        />
      )}

      {/* Holiday Modal */}
      {selectedHoliday && (
        <HolidayModal
          holiday={selectedHoliday}
          onClose={() => setSelectedHoliday(null)}
        />
      )}
    </>
  );
}
