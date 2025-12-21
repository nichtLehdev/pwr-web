"use client";

import { useEffect } from "react";
import type { Holiday } from "@/lib/holidays";

interface HolidayModalProps {
  holiday: Holiday;
  onClose: () => void;
}

export default function HolidayModal({ holiday, onClose }: HolidayModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-background dark:bg-dark-surface relative w-full max-w-md rounded-lg p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="text-dark dark:text-dark-text absolute top-4 right-4 rounded-full p-1 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Schließen"
        >
          <svg
            className="h-6 w-6"
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

        {/* Holiday Icon */}
        <div className="mb-4 flex items-center gap-3">
          <span className="text-amber-600 dark:text-amber-400">
            {/* Scale up the icon */}
            <div className="scale-[2]">{holiday.icon}</div>
          </span>
          <h2 className="text-dark dark:text-dark-text ml-4 text-2xl font-bold">
            {holiday.name}
          </h2>
        </div>

        {/* Date */}
        <div className="mb-4">
          <p className="text-gray-600 dark:text-gray-300">
            {holiday.date.toLocaleDateString("de-DE", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Description */}
        {holiday.description && (
          <div className="mb-4">
            <p className="text-dark dark:text-dark-text text-sm">
              {holiday.description}
            </p>
          </div>
        )}

        {/* Validity */}
        <div className="dark:border-dark-border rounded-lg border border-gray-200 bg-gray-50 p-4 dark:bg-gray-800">
          <h3 className="text-dark dark:text-dark-text mb-2 text-sm font-semibold">
            {holiday.isLegalHoliday === false
              ? "Kirchlicher Feiertag"
              : "Gesetzlicher Feiertag"}
          </h3>
          {holiday.isNationwide ? (
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {holiday.isLegalHoliday === false
                  ? "Bundesweit"
                  : "Bundesweiter Feiertag"}
              </span>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-xs text-gray-600 dark:text-gray-400">
                {holiday.isLegalHoliday === false
                  ? "Kirchlicher Feiertag (kein arbeitsfreier Tag)"
                  : "Gesetzlicher Feiertag in folgenden Bundesländern:"}
              </p>
              {holiday.states && (
                <ul className="ml-4 space-y-1">
                  {holiday.states.map((state) => (
                    <li
                      key={state}
                      className="text-sm text-gray-700 dark:text-gray-300"
                    >
                      • {state}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Close button at bottom */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-primary hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
