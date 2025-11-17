"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { HistoryEvent } from "@/types/general";

interface HistoryTimelineProps {
  events: HistoryEvent[];
}

export default function HistoryTimeline({ events }: HistoryTimelineProps) {
  const [selectedEvent, setSelectedEvent] = useState<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Kategorien-Icons und -Farben
  const categoryConfig = {
    founding: {
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      ),
      color: "bg-district-1",
      lightColor: "bg-district-1/10",
    },
    milestone: {
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
        />
      ),
      color: "bg-primary",
      lightColor: "bg-primary/10",
    },
    expansion: {
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
        />
      ),
      color: "bg-district-2",
      lightColor: "bg-district-2/10",
    },
    modernization: {
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      ),
      color: "bg-district-4",
      lightColor: "bg-district-4/10",
    },
    partnership: {
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      ),
      color: "bg-district-5",
      lightColor: "bg-district-5/10",
    },
  };

  // Scroll to selected event
  useEffect(() => {
    if (scrollContainerRef.current && timelineRef.current) {
      const container = scrollContainerRef.current;
      const timeline = timelineRef.current;
      const buttons = timeline.querySelectorAll("button");
      const selectedButton = buttons[selectedEvent];

      if (selectedButton) {
        const buttonLeft = selectedButton.offsetLeft;
        const buttonWidth = selectedButton.offsetWidth;
        const containerWidth = container.offsetWidth;

        // Zentriere den ausgewählten Button
        const scrollPosition =
          buttonLeft - containerWidth / 2 + buttonWidth / 2;
        container.scrollTo({
          left: scrollPosition,
          behavior: "smooth",
        });
      }
    }
  }, [selectedEvent]);

  const event = events[selectedEvent];
  const config = categoryConfig[event.category || "milestone"];

  return (
    <div className="space-y-8">
      {/* Timeline Navigation */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-primary scrollbar-track-gray-200"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#faa619 #e5e7eb",
          }}
        >
          <div
            ref={timelineRef}
            className="flex items-center gap-2 min-w-max px-4"
          >
            {/* Timeline-Linie */}
            <div className="absolute top-8 left-0 right-0 h-0.5 bg-gray-300 mx-4"></div>

            {events.map((evt, index) => {
              const isSelected = index === selectedEvent;
              const evtConfig = categoryConfig[evt.category || "milestone"];

              return (
                <button
                  key={index}
                  onClick={() => setSelectedEvent(index)}
                  className={`relative shrink-0 transition-all duration-300 ${
                    isSelected ? "scale-110" : "hover:scale-105"
                  }`}
                >
                  {/* Jahr */}
                  <div
                    className={`text-sm font-bold mb-2 transition-colors ${
                      isSelected ? "text-primary" : "text-gray-500"
                    }`}
                  >
                    {evt.year}
                  </div>

                  {/* Marker */}
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md ${
                      isSelected
                        ? `${evtConfig.color} text-white ring-4 ring-primary/20`
                        : "bg-white text-gray-400 border-2 border-gray-300"
                    }`}
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {evtConfig.icon}
                    </svg>
                  </div>

                  {/* Verbindungslinie zum nächsten Event */}
                  {index < events.length - 1 && (
                    <div className="absolute top-8 left-12 w-2 h-0.5 bg-gray-300"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scroll-Hinweise */}
        <div className="absolute left-0 top-0 bottom-4 w-8 bg-linear-to-r from-background to-transparent pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-4 w-8 bg-linear-to-l from-background to-transparent pointer-events-none"></div>
      </div>

      {/* Event Details */}
      <div
        className={`rounded-lg overflow-hidden shadow-lg ${config.lightColor}`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 lg:p-8">
          {/* Bild */}
          <div className="relative h-64 lg:h-full min-h-[300px] rounded-lg overflow-hidden bg-gray-200">
            {event.image ? (
              <Image
                src={event.image}
                alt={event.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className={`w-20 h-20 text-gray-400`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {config.icon}
                </svg>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center`}
              >
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {config.icon}
                </svg>
              </div>
              <span className="text-3xl font-bold text-primary">
                {event.year}
              </span>
            </div>

            <h3 className="text-2xl md:text-3xl font-bold text-dark mb-4">
              {event.title}
            </h3>

            <p className="text-gray-600 text-lg leading-relaxed">
              {event.description}
            </p>

            {/* Navigation Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectedEvent(Math.max(0, selectedEvent - 1))}
                disabled={selectedEvent === 0}
                className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
                Zurück
              </button>

              <button
                onClick={() =>
                  setSelectedEvent(
                    Math.min(events.length - 1, selectedEvent + 1)
                  )
                }
                disabled={selectedEvent === events.length - 1}
                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                Weiter
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
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="text-center text-sm text-gray-500">
        {selectedEvent + 1} von {events.length} Ereignissen
      </div>
    </div>
  );
}
