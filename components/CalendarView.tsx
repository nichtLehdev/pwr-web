'use client';

import { useState } from 'react';
import CompactEventCard from './CompactEventCard';
import { getDistrictColor } from '@/lib/districtColors';
import type { Event, Course } from '@/types/strapi';

interface CalendarItem {
  type: 'event' | 'course';
  data: Event | Course;
  date: Date;
}

interface CalendarViewProps {
  items: Array<{ type: 'event' | 'course' } & (Event | Course)>;
}

export default function CalendarView({ items }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Parse items zu CalendarItems
  const calendarItems: CalendarItem[] = items.map(item => ({
    type: item.type,
    data: item as any,
    date: new Date(item.type === 'event' ? (item as any).eventDate : (item as any).startDate)
  }));

  // Kalender-Helper Funktionen
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Montag = 0

    return { daysInMonth, startingDayOfWeek, firstDay, lastDay };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);

  // Events für einen Tag finden
  const getEventsForDay = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return calendarItems.filter(item => {
      // Für Courses: prüfe ob der Tag zwischen Start und Ende liegt
      if (item.type === 'course') {
        const course = item.data as Course;
        const endDate = new Date(course.endDate);
        return item.date <= endOfDay && endDate >= startOfDay;
      }
      // Für Events: nur der exakte Tag
      return item.date >= startOfDay && item.date <= endOfDay;
    });
  };
  
  // Prüfe ob ein Course an diesem Tag startet oder endet
  const getCourseStatusForDay = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const courses = calendarItems.filter(item => item.type === 'course');
    
    for (const course of courses) {
      const startDate = course.date;
      const endDate = new Date((course.data as Course).endDate);
      
      // Startet an diesem Tag
      if (startDate >= startOfDay && startDate <= endOfDay) {
        return 'start';
      }
      // Endet an diesem Tag
      if (endDate >= startOfDay && endDate <= endOfDay) {
        return 'end';
      }
      // Läuft während diesem Tag
      if (startDate < startOfDay && endDate > endOfDay) {
        return 'ongoing';
      }
    }
    
    return null;
  };

  // Items für den ausgewählten Tag
  const getItemsForSelectedDay = () => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    return calendarItems
      .filter(item => {
        // Für Courses: prüfe ob der ausgewählte Tag zwischen Start und Ende liegt
        if (item.type === 'course') {
          const course = item.data as Course;
          const endDate = new Date(course.endDate);
          return item.date <= endOfDay && endDate >= startOfDay;
        }
        // Für Events: nur der exakte Tag
        return item.date >= startOfDay && item.date <= endOfDay;
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  // Items NACH dem ausgewählten Tag
  const getUpcomingItems = () => {
    const startOfNextDay = new Date(selectedDate);
    startOfNextDay.setDate(startOfNextDay.getDate() + 1);
    startOfNextDay.setHours(0, 0, 0, 0);
    
    return calendarItems
      .filter(item => item.date >= startOfNextDay)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 10); // Max 10 nächste Events
  };

  const todayItems = getItemsForSelectedDay();
  const upcomingItems = getUpcomingItems();

  // Navigation
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  const monthName = currentMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

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
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-dark">
            {monthName}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Vorheriger Monat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              Heute
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Nächster Monat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Wochentage */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
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
            const today = isToday(day);
            const selected = isSelected(day);

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center relative transition-colors ${
                  selected
                    ? 'bg-primary text-white font-bold'
                    : today
                    ? 'bg-primary/20 text-primary font-bold'
                    : courseStatus
                    ? 'bg-primary/5'
                    : 'hover:bg-gray-100'
                }`}
              >
                {/* Multi-day course indicator */}
                {courseStatus && (
                  <div className={`absolute top-0 left-0 right-0 h-0.5 ${
                    selected ? 'bg-white' : 'bg-primary'
                  } ${
                    courseStatus === 'start' ? 'rounded-l-full' : 
                    courseStatus === 'end' ? 'rounded-r-full' : ''
                  }`} />
                )}
                
                <span className="text-sm md:text-base">{day}</span>
                
                {/* Event Indicators mit Bezirks-Farben */}
                {hasEvents && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {events.slice(0, 3).map((event, idx) => {
                      const districtName = (event.data as any).districtInfo.name;
                      return (
                        <div
                          key={idx}
                          className="w-1 h-1 rounded-full"
                          style={{ 
                            backgroundColor: selected 
                              ? '#FFFFFF' 
                              : getDistrictColor(districtName)
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </button>
            );
          }          )}
        </div>
      </div>
      </div>
      {/* Ende Mobile Kalender */}

      {/* Events für den ausgewählten Tag - nur Mobile */}
      <div className="lg:hidden">
        <h3 className="text-lg font-bold text-dark mb-3">
          {selectedDate.toLocaleDateString('de-DE', { 
            weekday: 'long',
            day: 'numeric', 
            month: 'long',
            year: selectedDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
          })}
        </h3>

        {todayItems.length > 0 ? (
          <div className="space-y-2 mb-6">
            {todayItems.map((item, idx) => (
              <CompactEventCard
                key={`today-${item.type}-${(item.data as any).id}-${idx}`}
                id={(item.data as any).id}
                title={(item.data as any).title}
                date={item.type === 'event' ? (item.data as Event).eventDate : (item.data as Course).startDate}
                endDate={item.type === 'course' ? (item.data as Course).endDate : undefined}
                location={(item.data as any).location.city}
                category={item.type === 'event' ? (item.data as Event).category : (item.data as Course).courseType}
                type={item.type}
                districtName={(item.data as any).districtInfo.name}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-sm mb-6 py-4 text-center bg-gray-50 rounded-lg">
            Keine Termine an diesem Tag
          </p>
        )}

        {/* Nächste Termine */}
        {upcomingItems.length > 0 && (
          <>
            <h4 className="text-base font-bold text-dark mb-3 mt-6">
              Nächste Termine
            </h4>
            <div className="space-y-2">
              {upcomingItems.map((item, idx) => (
                <CompactEventCard
                  key={`upcoming-${item.type}-${(item.data as any).id}-${idx}`}
                  id={(item.data as any).id}
                  title={(item.data as any).title}
                  date={item.type === 'event' ? (item.data as Event).eventDate : (item.data as Course).startDate}
                  endDate={item.type === 'course' ? (item.data as Course).endDate : undefined}
                  location={(item.data as any).location.city}
                  category={item.type === 'event' ? (item.data as Event).category : (item.data as Course).courseType}
                  type={item.type}
                  districtName={(item.data as any).districtInfo.name}
                />
              ))}
            </div>
          </>
        )}

        {todayItems.length === 0 && upcomingItems.length === 0 && (
          <p className="text-gray-600 text-center py-8">
            Keine weiteren Termine geplant.
          </p>
        )}
      </div>
    </div>
  );
}