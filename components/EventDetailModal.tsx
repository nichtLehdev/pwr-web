"use client";

import { useEffect } from "react";
import Link from "next/link";
import { getDistrictColor } from "@/lib/districtColors";
import type { Event, Course } from "@/types/strapi";

interface CalendarItem {
  type: "event" | "course";
  data: Event | Course;
  date: Date;
  endDate?: Date;
}

interface EventDetailModalProps {
  event: CalendarItem;
  onClose: () => void;
}

export default function EventDetailModal({
  event,
  onClose,
}: EventDetailModalProps) {
  const eventData = event.data as any;
  const districtColor = getDistrictColor(eventData.districtInfo.name);

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

  // Close on ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header mit Farbe */}
        <div
          className="p-6 text-white"
          style={{ backgroundColor: districtColor }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <span className="text-sm font-semibold opacity-90">
                {event.type === "course"
                  ? eventData.courseType
                  : eventData.category}
              </span>
              <h2 className="text-2xl font-bold mt-1">{eventData.title}</h2>
              {eventData.motto && (
                <p className="text-sm opacity-90 mt-1 italic">
                  {eventData.motto}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg
                className="w-6 h-6"
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
        <div className="p-6 space-y-6">
          {/* Datum & Zeit */}
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-gray-400 mt-0.5 shrink-0"
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
              <p className="font-semibold text-dark">{startDate}</p>
              {isMultiDay ? (
                <p className="text-sm text-gray-600">bis {endDate}</p>
              ) : (
                <p className="text-sm text-gray-600">{startTime} Uhr</p>
              )}
            </div>
          </div>

          {/* Ort */}
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-gray-400 mt-0.5 shrink-0"
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
              <p className="font-semibold text-dark">
                {eventData.location.venue || eventData.location.city}
              </p>
              {eventData.location.street && (
                <p className="text-sm text-gray-600">
                  {eventData.location.street}
                </p>
              )}
              <p className="text-sm text-gray-600">
                {eventData.location.zipCode && `${eventData.location.zipCode} `}
                {eventData.location.city}
              </p>
            </div>
          </div>

          {/* Bezirk */}
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-gray-400 mt-0.5 shrink-0"
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
              <p className="font-semibold text-dark">
                {eventData.districtInfo.name}
              </p>
            </div>
          </div>

          {/* Beschreibung */}
          {eventData.description && (
            <div>
              <h3 className="font-semibold text-dark mb-2">Beschreibung</h3>
              <div
                className="text-gray-600 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: eventData.description }}
              />
            </div>
          )}

          {/* Course-spezifische Infos */}
          {event.type === "course" && (
            <>
              {eventData.prerequisites && (
                <div>
                  <h3 className="font-semibold text-dark mb-2">
                    Voraussetzungen
                  </h3>
                  <p className="text-gray-600">{eventData.prerequisites}</p>
                </div>
              )}

              {eventData.spotsAvailable !== undefined && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-dark">
                      Verfügbare Plätze
                    </span>
                    <span className="text-lg font-bold text-primary">
                      {eventData.spotsAvailable} / {eventData.maxParticipants}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Link
              href={`/termine/${eventData.type}/${eventData.id}`}
              className="flex-1 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors text-center"
              onClick={onClose}
            >
              Alle Details ansehen
            </Link>
            <button
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
