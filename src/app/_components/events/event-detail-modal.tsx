"use client";

import { useEffect } from "react";
import Link from "next/link";
import { getDistrictColor } from "@/lib/district-color";
import type { CalendarItem } from "@/lib/types/calendar";

interface EventDetailModalProps {
  event: CalendarItem & {
    date: Date;
    endDate?: Date;
  };
  onClose: () => void;
}

export default function EventDetailModal({
  event,
  onClose,
}: EventDetailModalProps) {
  const districtColor = getDistrictColor(event.bezirk?.number);

  const isMultiDay = event.type === "course" && event.endDate;
  const startDate = event.date.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const startTime = event.date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const endDate = event.endDate?.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
    return () => {
      document.body.style.overflow = "unset";
      document.body.classList.remove("modal-open");
    };
  }, []);

  const categoryLabel =
    event.type === "course" ? event.courseType : event.category;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="dark:bg-dark-surface dark:shadow-dark-border max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with color */}
        <div
          className="p-6 text-white"
          style={{
            backgroundColor:
              event.type === "event" && event.cancelled
                ? "#dc2626"
                : districtColor,
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {event.type === "event" && event.cancelled && (
                  <span className="inline-flex items-center gap-1 rounded bg-white/20 px-2 py-0.5 text-xs font-bold uppercase">
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Abgesagt
                  </span>
                )}
                <span className="text-sm font-semibold opacity-90">
                  {categoryLabel}
                </span>
              </div>
              <h2
                className={`mt-1 text-2xl font-bold wrap-break-word ${event.type === "event" && event.cancelled ? "line-through opacity-75" : ""}`}
              >
                {event.title}
              </h2>
              {event.motto && (
                <p className="mt-1 text-sm italic opacity-90">{event.motto}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="ml-4 rounded-lg p-2 transition-colors hover:bg-white/20"
              aria-label="Modal schließen"
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
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6">
          {/* Cancelled Warning */}
          {event.type === "event" && event.cancelled && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/30">
              <div className="flex items-start gap-3">
                <svg
                  className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <h3 className="mb-1 font-semibold text-red-900 dark:text-red-100">
                    Veranstaltung abgesagt
                  </h3>
                  <p className="text-sm text-red-800 dark:text-red-200">
                    Diese Veranstaltung findet nicht mehr statt.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <div>
              <p className="text-dark dark:text-dark-text font-semibold">
                {startDate}
              </p>
              {isMultiDay ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  bis {endDate}
                </p>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {startTime} Uhr
                </p>
              )}
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <svg
                className="mt-0.5 h-5 w-5 shrink-0 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <div>
                <p className="text-dark dark:text-dark-text font-semibold">
                  {event.location.name || event.location.city}
                </p>
                {event.location.street && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {event.location.street}
                  </p>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {event.location.zipCode && `${event.location.zipCode} `}
                  {event.location.city}
                </p>
              </div>
            </div>
          )}

          {/* District */}
          {event.bezirk && (
            <div className="flex items-start gap-3">
              <svg
                className="mt-0.5 h-5 w-5 shrink-0 text-gray-400"
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
              <div>
                <p className="text-dark dark:text-dark-text font-semibold">
                  {event.bezirk.name}
                </p>
              </div>
            </div>
          )}

          {/* Participation offer - only for events */}
          {event.type === "event" && event.openToParticipants && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/30">
              <div className="flex items-start gap-3">
                <svg
                  className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400"
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
                <div>
                  <h3 className="mb-1 font-semibold text-green-900 dark:text-green-100">
                    Mitmachangebot
                  </h3>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    {event.participationInfo ||
                      "Bei dieser Veranstaltung können Sie gerne mitspielen! Kontaktieren Sie die Veranstalter für weitere Informationen."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div>
              <h3 className="text-dark dark:text-dark-text mb-2 font-semibold">
                Beschreibung
              </h3>
              <div className="whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                {event.description}
              </div>
            </div>
          )}

          {/* Ensemble info - only for events */}
          {event.type === "event" && event.performingEnsembleName && (
            <div>
              <h3 className="text-dark dark:text-dark-text mb-2 font-semibold">
                Mitwirkende
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {event.performingEnsembleName}
              </p>
            </div>
          )}

          {/* Conductor */}
          {event.type === "event" && event.leitung && (
            <div>
              <h3 className="text-dark dark:text-dark-text mb-2 font-semibold">
                Leitung
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {event.leitung}
              </p>
            </div>
          )}

          {/* Course-specific info */}
          {event.type === "course" && (
            <>
              {event.prerequisites && (
                <div>
                  <h3 className="text-dark dark:text-dark-text mb-2 font-semibold">
                    Voraussetzungen
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {event.prerequisites}
                  </p>
                </div>
              )}

              {event.targetAudience && (
                <div>
                  <h3 className="text-dark dark:text-dark-text mb-2 font-semibold">
                    Zielgruppe
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {event.targetAudience}
                  </p>
                </div>
              )}

              {event.maxParticipants && (
                <div className="dark:bg-dark-background-secondary rounded-lg bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-dark dark:text-dark-text font-semibold">
                      Max. Teilnehmer
                    </span>
                    <span className="text-primary text-lg font-bold">
                      {event.maxParticipants}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div className="dark:border-dark-border flex gap-3 border-t border-gray-200 pt-4">
            <Link
              href={`/termine/${event.type}/${event.id}`}
              className="bg-primary hover:bg-primary-dark flex-1 rounded-lg px-6 py-3 text-center font-semibold text-white transition-colors"
              onClick={onClose}
            >
              Alle Details ansehen
            </Link>
            <button
              onClick={onClose}
              className="dark:border-dark-border dark:hover:bg-dark-background-secondary rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
