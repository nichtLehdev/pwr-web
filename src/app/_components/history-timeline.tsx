"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import type { RouterOutputs } from "@/trpc/react";
import MediaCredit from "@/app/_components/general/media-credit";
import {
  GraduationCap,
  Star,
  Expand,
  Zap,
  Heart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

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
      icon: <GraduationCap className="h-6 w-6" />,
      color: "bg-district-1",
      lightColor: "bg-district-1/10",
    },
    MILESTONE: {
      icon: <Star className="h-6 w-6" />,
      color: "bg-primary",
      lightColor: "bg-primary/10",
    },
    EXPANSION: {
      icon: <Expand className="h-6 w-6" />,
      color: "bg-district-2",
      lightColor: "bg-district-2/10",
    },
    MODERNIZATION: {
      icon: <Zap className="h-6 w-6" />,
      color: "bg-district-4",
      lightColor: "bg-district-4/10",
    },
    PARTNERSHIP: {
      icon: <Heart className="h-6 w-6" />,
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
                    {evtConfig.icon}
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
          <div className="flex flex-col gap-1">
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
                  <div className="text-gray-400">{config.icon}</div>
                </div>
              )}
            </div>
            {event.image && (
              <MediaCredit
                copyright={event.image.copyright}
                creator={event.image.creator}
                showCreatorIcon
                className="text-right"
              />
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col justify-center">
            <div className="mb-4 flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-full ${config.color} flex items-center justify-center`}
              >
                <div className="text-white">{config.icon}</div>
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
                <ChevronLeft className="h-5 w-5" />
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
                <ChevronRight className="h-5 w-5" />
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
