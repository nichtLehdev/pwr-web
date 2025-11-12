'use client';

import { useState } from 'react';
import { getDistrictColor } from '@/lib/districtColors';
import EventDetailModal from './EventDetailModal';
import type { Event, Course } from '@/types/strapi';

interface CalendarItem {
  type: 'event' | 'course';
  data: Event | Course;
  date: Date;
  endDate?: Date;
}

interface DesktopCalendarViewProps {
  items: Array<{ type: 'event' | 'course' } & (Event | Course)>;
}

export default function DesktopCalendarView({ items }: DesktopCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarItem | null>(null);

  // Parse items zu CalendarItems
  const calendarItems: CalendarItem[] = items.map(item => ({
    type: item.type,
    data: item as any,
    date: new Date(item.type === 'event' ? (item as any).eventDate : (item as any).startDate),
    endDate: item.type === 'course' ? new Date((item as any).endDate) : undefined,
  }));

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

  // Events für einen Tag
  const getEventsForDay = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return calendarItems.filter(item => {
      // Für Single-Day Events
      if (!item.endDate || item.type === 'event') {
        return item.date >= startOfDay && item.date <= endOfDay;
      }
      // Für Multi-Day Courses: zeige an jedem Tag
      return item.date <= endOfDay && item.endDate >= startOfDay;
    });
  };

  // Sammle alle Courses und weise ihnen Zeilen zu (für Stacking)
  const getCoursesWithRows = () => {
    const courses = calendarItems.filter(item => item.type === 'course' && item.endDate);
    const rows: CalendarItem[][] = [];
    
    courses.forEach(course => {
      // Finde erste Zeile wo der Course reinpasst (keine Überlappung)
      let placed = false;
      for (let i = 0; i < rows.length; i++) {
        const hasOverlap = rows[i].some(existingCourse => {
          const existingEnd = existingCourse.endDate!;
          return !(course.endDate! < existingCourse.date || course.date > existingEnd);
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
  };

  const courseRows = getCoursesWithRows();

  // Prüfe ob Course an diesem Tag läuft und in welcher Zeile
  const getCoursesForDay = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const coursesAtDay: Array<{ course: CalendarItem; row: number; isStart: boolean; isEnd: boolean; isWeekStart: boolean }> = [];

    courseRows.forEach((row, rowIndex) => {
      const course = row.find(c => 
        c.date <= endOfDay && c.endDate! >= startOfDay
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
          isWeekStart 
        });
      }
    });

    return coursesAtDay;
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const monthName = currentMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const weekDays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-2xl font-bold text-dark">
            {monthName}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              Heute
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Wochentage */}
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {weekDays.map(day => (
            <div key={day} className="text-center text-sm font-semibold text-gray-600 py-3 px-2">
              {day}
            </div>
          ))}
        </div>

        {/* Kalender Grid */}
        <div className="grid grid-cols-7" style={{ gridAutoRows: '140px' }}>
          {/* Leere Zellen */}
          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="border-r border-b bg-gray-50/50" />
          ))}

          {/* Tage */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const events = getEventsForDay(day);
            const today = isToday(day);
            const coursesAtDay = getCoursesForDay(day);
            const maxRows = courseRows.length;

            return (
              <div
                key={day}
                className={`border-r border-b relative ${
                  today ? 'bg-primary/5' : 'hover:bg-gray-50'
                }`}
              >
                {/* Datum */}
                <div className="absolute top-2 left-2 z-10">
                  <span className={`text-sm font-semibold ${
                    today ? 'text-white bg-primary rounded-full w-6 h-6 flex items-center justify-center' : 'text-gray-700'
                  }`}>
                    {day}
                  </span>
                </div>

                {/* Multi-day course bars - absolute positioning für seamless bars */}
                <div className="absolute top-8 left-0 right-0">
                  {/* Platzhalter für alle möglichen Rows */}
                  {Array.from({ length: maxRows }).map((_, rowIndex) => {
                    const courseData = coursesAtDay.find(c => c.row === rowIndex);
                    
                    if (!courseData) {
                      // Leere Row für Spacing
                      return <div key={rowIndex} className="h-5 mb-1" />;
                    }

                    const { course, isStart, isEnd, isWeekStart } = courseData;
                    const eventData = course.data as any;
                    const showTitle = isStart || isWeekStart;

                    return (
                      <div
                        key={rowIndex}
                        className={`h-5 mb-1 text-[11px] font-semibold text-white py-0.5 truncate cursor-pointer hover:opacity-90 transition-opacity ${
                          isStart && isEnd
                            ? 'rounded mx-2 px-2' // Single day: voller Margin
                            : isStart 
                            ? 'rounded-l ml-2 pl-2 pr-0 -mr-px' // Start: nur links Margin
                            : isEnd 
                            ? 'rounded-r mr-2 pr-2 pl-0 -ml-px' // Ende: nur rechts Margin
                            : 'pl-0 pr-0 -mx-px' // Mitte: kein Margin, überlappend
                        }`}
                        style={{ backgroundColor: getDistrictColor(eventData.districtInfo.name) }}
                        onClick={() => setSelectedEvent(course)}
                        title={eventData.title}
                      >
                        {showTitle ? eventData.title : '\u00A0'}
                      </div>
                    );
                  })}
                </div>

                {/* Events (keine Courses) - unterhalb der Course-Bars */}
                <div className="absolute left-2 right-2 space-y-1" style={{ top: `${8 + maxRows * 24}px` }}>
                  {events
                    .filter(e => e.type === 'event')
                    .slice(0, 3)
                    .map((event, idx) => {
                      const eventData = event.data as any;
                      const time = event.date.toLocaleTimeString('de-DE', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      });
                      
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedEvent(event)}
                          className="w-full text-left text-[11px] px-2 py-1 rounded truncate hover:opacity-90 transition-opacity text-white font-medium"
                          style={{ backgroundColor: getDistrictColor(eventData.districtInfo.name) }}
                          title={`${time} ${eventData.title}`}
                        >
                          {time} {eventData.title}
                        </button>
                      );
                    })}
                  
                  {/* +X mehr... */}
                  {events.filter(e => e.type === 'event').length > 3 && (
                    <div className="text-[10px] text-gray-500 px-2">
                      +{events.filter(e => e.type === 'event').length - 3} mehr...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </>
  );
}