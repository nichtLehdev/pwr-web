"use client";

import { getDistrictColor } from "@/lib/district-color";
import type { CalendarItemInternal } from "./desktop-calendar-view";
import { useEffect } from "react";

interface MoreEventsModalProps {
  day: number;
  currentMonth: Date;
  events: CalendarItemInternal[];
  onClose: () => void;
  onSelectEvent: (event: CalendarItemInternal) => void;
}

export default function MoreEventsModal({
  day,
  currentMonth,
  events,
  onClose,
  onSelectEvent,
}: MoreEventsModalProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
    return () => {
      document.body.style.overflow = "unset";
      document.body.classList.remove("modal-open");
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="more-events-title"
    >
      <div
        className="bg-background-secondary dark:bg-dark-surface dark:shadow-dark-border max-h-[80vh] w-full max-w-md overflow-hidden rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dark:border-dark-border flex items-center justify-between border-b border-gray-200 p-4">
          <h3
            id="more-events-title"
            className="text-dark dark:text-dark-text text-lg font-bold"
          >
            Events am {day}.{" "}
            {currentMonth.toLocaleDateString("de-DE", {
              month: "long",
              year: "numeric",
            })}
          </h3>
          <button
            onClick={onClose}
            className="dark:hover:bg-dark-background-secondary rounded p-1 transition-colors hover:bg-gray-100"
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
          {events.map((item, idx) => {
            const isCourse = item.type === "course";
            const isCancelled = item.type === "event" && item.cancelled;
            const districtColor = getDistrictColor(item.bezirk?.number);

            return (
              <button
                key={idx}
                onClick={() => {
                  onSelectEvent(item);
                }}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  isCancelled
                    ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                    : "dark:border-dark-border dark:bg-dark-surface dark:hover:bg-dark-background border-gray-200 bg-white hover:bg-gray-50"
                }`}
                style={{
                  borderLeftWidth: "4px",
                  borderLeftColor: isCancelled ? "#dc2626" : districtColor,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`flex-1 font-semibold ${
                      isCancelled
                        ? "text-gray-500 line-through dark:text-gray-400"
                        : "text-dark dark:text-dark-text"
                    }`}
                  >
                    {item.title}
                  </div>
                  {isCancelled && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      Abgesagt
                    </span>
                  )}
                  {!isCancelled &&
                    !isCourse &&
                    item.type === "event" &&
                    item.openToParticipants && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-600 dark:bg-green-900/20 dark:text-green-400">
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
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
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
                      <span className="bg-background-tertiary dark:bg-dark-background-secondary text-dark dark:text-dark-text ml-2 rounded px-2 py-0.5 text-xs">
                        {item.type === "event" && item.category}
                      </span>
                    </>
                  )}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {item.bezirk?.name || ""}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
