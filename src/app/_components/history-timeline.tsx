"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import type { RouterOutputs } from "@/trpc/react";

type HistoryEvent = RouterOutputs["organization"]["getHistory"][number];

interface HistoryTimelineProps {
  events: HistoryEvent[];
}

export default function HistoryTimeline({ events }: HistoryTimelineProps) {
  const [selectedEvent, setSelectedEvent] = useState<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const categoryConfig = {
    FOUNDING: {
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
    MILESTONE: {
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
    EXPANSION: {
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
    MODERNIZATION: {
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
    PARTNERSHIP: {
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

  if (!event) {
    return <div>Keine Ereignisse verfügbar.</div>;
  }

  const config = categoryConfig[event.category ?? "MILESTONE"];

  return (
    <div className="space-y-8">
      {/* Timeline Navigation */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="scrollbar-thin scrollbar-thumb-primary scrollbar-track-gray-200 overflow-x-auto pb-4"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#faa619 #e5e7eb",
          }}
        >
          <div
            ref={timelineRef}
            className="flex min-w-max items-center gap-2 px-4"
          >
            {/* Timeline-Linie */}
            <div className="dark:bg-dark-border absolute top-8 right-0 left-0 mx-4 h-0.5 bg-gray-300"></div>

            {events.map((evt, index) => {
              const isSelected = index === selectedEvent;
              const evtConfig = categoryConfig[evt.category || "MILESTONE"];

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
                    className={`mb-2 text-sm font-bold transition-colors ${
                      isSelected ? "text-primary" : "text-gray-500"
                    }`}
                  >
                    {evt.year}
                  </div>

                  {/* Marker */}
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full shadow-md transition-all ${
                      isSelected
                        ? `${evtConfig.color} ring-primary/20 text-white ring-4`
                        : "dark:border-dark-border dark:bg-dark-surface border-2 border-gray-300 bg-white text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {evtConfig.icon}
                    </svg>
                  </div>

                  {/* Verbindungslinie zum nächsten Event */}
                  {index < events.length - 1 && (
                    <div className="absolute top-8 left-12 h-0.5 w-2 bg-gray-300"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scroll-Hinweise */}
        <div className="from-background dark:from-dark-background pointer-events-none absolute top-0 bottom-4 left-0 w-8 bg-linear-to-r to-transparent"></div>
        <div className="from-background dark:from-dark-background pointer-events-none absolute top-0 right-0 bottom-4 w-8 bg-linear-to-l to-transparent"></div>
      </div>

      {/* Event Details */}
      <div
        className={`overflow-hidden rounded-lg shadow-lg ${config.lightColor}`}
      >
        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2 lg:p-8">
          {/* Bild */}
          <div className="relative h-64 min-h-[300px] overflow-hidden rounded-lg bg-gray-200 lg:h-full">
            {event.image ? (
              <Image
                src={event.image.url}
                alt={event.image.alt || event.title || "Ereignisbild"}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className={`h-20 w-20 text-gray-400`}
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
            <div className="mb-4 flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-full ${config.color} flex items-center justify-center`}
              >
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {config.icon}
                </svg>
              </div>
              <span className="text-primary text-3xl font-bold">
                {event.year}
              </span>
            </div>

            <h3 className="text-dark dark:text-dark-text mb-4 line-clamp-2 text-2xl font-bold md:text-3xl">
              {event.title}
            </h3>

            <p className="text-lg leading-relaxed text-gray-600 dark:text-gray-400">
              {event.description}
            </p>

            {/* Navigation Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setSelectedEvent(Math.max(0, selectedEvent - 1))}
                disabled={selectedEvent === 0}
                className="dark:border-dark-border dark:bg-dark-surface dark:hover:bg-dark-background flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300"
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
                Zurück
              </button>

              <button
                onClick={() =>
                  setSelectedEvent(
                    Math.min(events.length - 1, selectedEvent + 1),
                  )
                }
                disabled={selectedEvent === events.length - 1}
                className="bg-primary hover:bg-primary-dark flex items-center gap-2 rounded-lg px-4 py-2 text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                Weiter
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
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        {selectedEvent + 1} von {events.length} Ereignissen
      </div>
    </div>
  );
}
