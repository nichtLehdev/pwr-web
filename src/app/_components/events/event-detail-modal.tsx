"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { CalendarItem } from "@/lib/types/calendar";
import { coursePath, eventPath } from "@/lib/slug";
import { X } from "lucide-react";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";
import LocationNavigationLink from "@/app/_components/general/location-navigation-link";
import { BezirkLabel } from "@/app/_components/programmheft/bezirk-label";
import { Tag } from "@/app/_components/programmheft/tag";
import { Note } from "@/app/_components/programmheft/note";
import { headMeta } from "@/app/_components/programmheft/page-head";
import { cn } from "@/lib/utils";
import { markdownToPlainText } from "@/lib/markdown-to-plain-text";
import { formatBerlin, isSameBerlinDay } from "@/lib/berlin-time";

interface EventDetailModalProps {
  event: CalendarItem & {
    date: Date;
    endDate?: Date;
  };
  onClose: () => void;
}

const OUTLINE_BUTTON =
  "semi-condensed border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night inline-flex min-h-12 flex-1 items-center justify-center gap-2 border-2 px-4 text-base font-semibold transition-colors";
const PRIMARY_BUTTON =
  "semi-condensed bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-primary dark:text-ink dark:hover:bg-paper inline-flex min-h-12 flex-1 items-center justify-center gap-3 px-4 text-base font-semibold transition-colors";

export default function EventDetailModal({
  event,
  onClose,
}: EventDetailModalProps) {
  const beschreibungText = markdownToPlainText(event.description ?? "");
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
    !isSameBerlinDay(courseStartDate, courseEndDate);

  const displayStartDate =
    event.type === "event"
      ? formatBerlin(eventDate!, "datumMitWochentag")
      : formatBerlin(courseStartDate!, "datumMitWochentag");

  const startTime =
    event.type === "event"
      ? formatBerlin(eventDate!, "uhrzeit")
      : formatBerlin(courseStartDate!, "uhrzeit");

  const endDateString =
    courseEndDate && formatBerlin(courseEndDate, "datumLang");

  const endTime = courseEndDate && formatBerlin(courseEndDate, "uhrzeit");

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
  const cancelled = event.type === "event" && event.cancelled;

  return (
    <ScrollableModal onBackdropClick={onClose} className="backdrop-blur-sm">
      <ScrollableModalCard
        maxW="2xl"
        className="border-ink dark:border-night-text rounded-none! border-2 shadow-none!"
      >
        {/* Header */}
        <div className="border-ink dark:border-night-text border-b-2 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {cancelled && <Tag tone="cancelled">Abgesagt</Tag>}
                <span className={headMeta.label}>{categoryLabel}</span>
                {event.bezirk && (
                  <span className={headMeta.label}>
                    <BezirkLabel bezirk={event.bezirk} />
                  </span>
                )}
              </div>
              <h2
                className={cn(
                  "condensed text-ink dark:text-night-text mt-2 text-2xl leading-tight font-extrabold wrap-break-word",
                  cancelled && "text-dark dark:text-night-muted line-through",
                )}
              >
                {event.title}
              </h2>
              {event.motto && (
                <p className="text-dark dark:text-night-muted mt-1 text-sm italic">
                  {event.motto}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-ink hover:bg-ink hover:text-paper dark:text-night-text dark:hover:bg-night-text dark:hover:text-night -mt-2 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center transition-colors"
              aria-label="Modal schließen"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <ScrollableModalBody className="space-y-5">
          {/* Cancelled Warning */}
          {cancelled && (
            <Note tone="error">
              <p>Diese Veranstaltung findet nicht mehr statt.</p>
            </Note>
          )}

          {/* Date & Time */}
          <div>
            <p className="text-ink dark:text-night-text font-semibold">
              {displayStartDate}
            </p>
            {event.type === "course" && isMultiDay ? (
              <p className="text-dark dark:text-night-muted text-sm">
                {startTime} Uhr - {endDateString}, {endTime} Uhr
              </p>
            ) : event.type === "course" ? (
              <p className="text-dark dark:text-night-muted text-sm">
                {startTime} Uhr - {endTime} Uhr
              </p>
            ) : (
              <p className="text-dark dark:text-night-muted text-sm">
                {startTime} Uhr
                {eventDuration && eventDuration > 0 && (
                  <span>
                    {" "}
                    ({Math.floor(eventDuration / 60)}h{" "}
                    {eventDuration % 60 > 0 ? `${eventDuration % 60}min` : ""})
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Location */}
          {event.location && (
            <div>
              <p className="text-ink dark:text-night-text font-semibold">
                {event.location.name || event.location.city}
              </p>
              {event.location.street && (
                <p className="text-dark dark:text-night-muted text-sm">
                  {event.location.street}
                </p>
              )}
              <p className="text-dark dark:text-night-muted text-sm">
                {event.location.zipCode && `${event.location.zipCode} `}
                {event.location.city}
              </p>
              <LocationNavigationLink
                location={event.location}
                variant="inline"
                className="mt-1"
              />
            </div>
          )}

          {/* Participation offer - only for events */}
          {event.type === "event" && event.openToParticipants && (
            <Note tone="important" title="Mitmachangebot" titleAs="h3">
              <p>
                {event.participationInfo ||
                  "Bei dieser Veranstaltung können Sie gerne mitspielen! Kontaktieren Sie die Veranstalter für weitere Informationen."}
              </p>
            </Note>
          )}

          {/* Beschreibung als Klartext, nicht als gesetzter Text: Das
              Schnellfenster des Kalenders ist eine Vorschau mit Link auf die
              Detailseite, und die Kalenderseite soll dafür nicht die
              Markdown- und Filterbibliotheken mitladen. `markdownToPlainText`
              behält Absätze und Umbrüche, entfernt aber die Syntaxzeichen. */}
          {beschreibungText && (
            <div>
              <h3 className="text-ink dark:text-night-text mb-1 font-semibold">
                Beschreibung
              </h3>
              <div className="text-dark dark:text-night-muted whitespace-pre-wrap">
                {beschreibungText}
              </div>
            </div>
          )}

          {/* Ensemble info - only for events */}
          {event.type === "event" && event.performingEnsembleName && (
            <div>
              <h3 className="text-ink dark:text-night-text mb-1 font-semibold">
                Mitwirkende
              </h3>
              <p className="text-dark dark:text-night-muted">
                {event.performingEnsembleName}
              </p>
            </div>
          )}

          {/* Conductor */}
          {event.type === "event" && event.leitung && (
            <div>
              <h3 className="text-ink dark:text-night-text mb-1 font-semibold">
                Leitung
              </h3>
              <p className="text-dark dark:text-night-muted">{event.leitung}</p>
            </div>
          )}

          {/* Course-specific info */}
          {event.type === "course" && (
            <>
              {event.prerequisites && (
                <div>
                  <h3 className="text-ink dark:text-night-text mb-1 font-semibold">
                    Voraussetzungen
                  </h3>
                  <p className="text-dark dark:text-night-muted">
                    {event.prerequisites}
                  </p>
                </div>
              )}

              {event.maxParticipants && (
                <div className="border-rule dark:border-night-rule flex items-center justify-between border-t pt-4">
                  <span className="text-ink dark:text-night-text font-semibold">
                    Max. Teilnehmer
                  </span>
                  <span className="condensed text-ink dark:text-night-text text-[1.75rem] leading-none font-extrabold tabular-nums">
                    {event.maxParticipants}
                  </span>
                </div>
              )}
            </>
          )}
        </ScrollableModalBody>
        <ScrollableModalFooter className="border-ink dark:border-night-text flex gap-3 border-t-2">
          <Link
            href={
              event.type === "course" ? coursePath(event) : eventPath(event)
            }
            className={PRIMARY_BUTTON}
            onClick={onClose}
          >
            Alle Details ansehen
          </Link>
          <button onClick={onClose} className={OUTLINE_BUTTON}>
            Schließen
          </button>
        </ScrollableModalFooter>
      </ScrollableModalCard>
    </ScrollableModal>
  );
}
