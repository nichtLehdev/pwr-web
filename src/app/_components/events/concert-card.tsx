import Link from "next/link";
import React from "react";
import type { RouterOutputs } from "@/trpc/react";
import { capitalizeFirstLetter } from "@/lib/utils";
import { Calendar, MapPin } from "lucide-react";
import { eventPath } from "@/lib/slug";
import { Tag } from "@/app/_components/programmheft/tag";

/**
 * Der Auswahlchor-Überblick rendert auf dem Server, dessen Zeitzone UTC ist.
 * Ohne feste Zone stand hier 15:00, während die Detailseite im Browser 17:00
 * anzeigte — Termine sind immer deutsche Ortszeit.
 */
const BERLIN_DATE = new Intl.DateTimeFormat("de-DE", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Europe/Berlin",
});
const BERLIN_TIME = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Berlin",
});

type Event = RouterOutputs["events"]["getById"];
type AuswahlChorEvent =
  RouterOutputs["auswahlchoere"]["getAll"]["auswahlchoere"][0]["events"][0];
type AuswahlChor = RouterOutputs["auswahlchoere"]["getAll"]["auswahlchoere"][0];

interface ConcertCardProps {
  concert: Event | AuswahlChorEvent;
  ensemble: AuswahlChor;
  i: number;
}

/** Termin als Wegzeile: Haarlinie statt Farbstreifen, Etikett statt Farbfläche. */
const ConcertCard: React.FC<ConcertCardProps> = ({ concert, i }) => {
  return (
    <Link
      key={i}
      href={eventPath(concert)}
      className="fill-row border-rule dark:border-night-rule flex items-start justify-between gap-4 border-b px-1 py-3"
    >
      <span className="min-w-0">
        <span className="condensed text-ink dark:text-night-text block text-lg leading-tight font-bold">
          {concert.title}
        </span>
        <span className="text-dark dark:text-night-muted mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4 shrink-0" aria-hidden />
            {BERLIN_DATE.format(new Date(concert.eventDate))},{" "}
            {BERLIN_TIME.format(new Date(concert.eventDate))}
          </span>
          {concert.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              {concert.location.name}, {concert.location.city}
            </span>
          )}
        </span>
      </span>

      <Tag tone="inverse" className="shrink-0">
        {capitalizeFirstLetter(concert.category)}
      </Tag>
    </Link>
  );
};

export default ConcertCard;
