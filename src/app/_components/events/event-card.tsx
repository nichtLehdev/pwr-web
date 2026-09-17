import Link from "next/link";
import { eventCategoryLabel } from "@/lib/termine-labels";
import { ArrowRight, Calendar, MapPin, Users } from "lucide-react";
import { eventPath } from "@/lib/slug";
import { BezirkLabel } from "@/app/_components/programmheft/bezirk-label";
import { Tag } from "@/app/_components/programmheft/tag";

interface EventCardProps {
  id: string;
  slug?: string | null;
  title: string;
  date: Date;
  duration?: number | null;
  location: string;
  category: string;
  district?: number;
  openToParticipants?: boolean;
  cancelled?: boolean;
}

/**
 * Termin als Programmzeile (keine Karte). Nicht mehr im Einsatz seit
 * `/termine` Termine über `ProgrammeRow`/`programme-data.ts` rendert — hier
 * nur für den Fall belassen, dass eine einzelne Zeile ohne den vollen
 * `ProgrammeEntry`-Datensatz gebraucht wird.
 */
export default function EventCard({
  id,
  slug,
  title,
  date,
  duration,
  location,
  category,
  district,
  openToParticipants,
  cancelled,
}: EventCardProps) {
  return (
    <Link
      href={eventPath({ id, slug })}
      className="fill-row border-rule dark:border-night-rule flex items-start justify-between gap-4 border-b px-1 py-4"
    >
      <span className="min-w-0">
        <span
          className={`condensed block text-xl leading-tight font-bold ${
            cancelled
              ? "text-dark dark:text-night-muted line-through"
              : "text-ink dark:text-night-text"
          }`}
        >
          {title}
        </span>
        <span className="text-dark dark:text-night-muted semi-condensed mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
          <span>{eventCategoryLabel(category)}</span>
          <BezirkLabel bezirk={district ? { number: district } : null} />
        </span>
        <span className="text-dark dark:text-night-muted mt-1 flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 shrink-0" aria-hidden />
          {date.toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
          ,{" "}
          {date.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {duration && duration > 0 && (
            <span>
              ({Math.floor(duration / 60)}h{" "}
              {duration % 60 > 0 ? `${duration % 60}min` : ""})
            </span>
          )}
        </span>
        <span className="text-dark dark:text-night-muted mt-1 flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden />
          {location}
        </span>
        <span className="mt-2 flex flex-wrap items-center gap-1.5 empty:mt-0">
          {cancelled && <Tag tone="cancelled">Abgesagt</Tag>}
          {openToParticipants && (
            <Tag tone="orange">
              <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Mitspielen möglich
            </Tag>
          )}
        </span>
      </span>
      <ArrowRight
        aria-hidden
        className="text-ink dark:text-night-text mt-1 h-5 w-5 shrink-0"
      />
    </Link>
  );
}
