"use client";

import { useEffect } from "react";
import Link from "next/link";
import { getDistrictColor } from "@/lib/district-color";
import type { CalendarItem } from "@/lib/types/calendar";
import { coursePath, eventPath } from "@/lib/slug";
import {
  CalendarIcon,
  CheckCircleIcon,
  CircleXIcon,
  MapPinIcon,
  X,
} from "lucide-react";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";

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

  const eventDate = event.type === "event" ? event.date : null;
  const eventDuration =
    event.type === "event" && event.duration ? event.duration : null;

  const courseStartDate =
    event.type === "course" ? new Date(event.startDate) : null;
  const courseEndDate =
    event.type === "course" ? new Date(event.endDate) : null;

  const isMultiDay =
    event.type === "course" &&
    courseStartDate &&
    courseEndDate &&
    courseStartDate.toDateString() !== courseEndDate.toDateString();

  const displayStartDate =
    event.type === "event"
      ? eventDate!.toLocaleDateString("de-DE", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : courseStartDate!.toLocaleDateString("de-DE", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });

  const startTime =
    event.type === "event"
      ? eventDate!.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : courseStartDate!.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        });

  const endDateString = courseEndDate?.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const endTime = courseEndDate?.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
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
    <ScrollableModal onBackdropClick={onClose} className="backdrop-blur-sm">
      <ScrollableModalCard
        maxW="2xl"
        className="dark:bg-dark-surface dark:shadow-dark-border overflow-hidden rounded-xl shadow-2xl"
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
                    <X className="h-3 w-3" />
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
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <ScrollableModalBody className="space-y-6">
          {/* Cancelled Warning */}
          {event.type === "event" && event.cancelled && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/30">
              <div className="flex items-start gap-3">
                <CircleXIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
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
            <CalendarIcon className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
            <div>
              <p className="text-dark dark:text-dark-text font-semibold">
                {displayStartDate}
              </p>
              {event.type === "course" && isMultiDay ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {startTime} Uhr - {endDateString}, {endTime} Uhr
                </p>
              ) : event.type === "course" ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {startTime} Uhr - {endTime} Uhr
                </p>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {startTime} Uhr
                  {eventDuration && eventDuration > 0 && (
                    <span>
                      {" "}
                      ({Math.floor(eventDuration / 60)}h{" "}
                      {eventDuration % 60 > 0 ? `${eventDuration % 60}min` : ""}
                      )
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
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
              <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
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
                <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
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
        </ScrollableModalBody>
        <ScrollableModalFooter>
          <div className="flex gap-3">
            <Link
              href={
                event.type === "course" ? coursePath(event) : eventPath(event)
              }
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
        </ScrollableModalFooter>
      </ScrollableModalCard>
    </ScrollableModal>
  );
}
