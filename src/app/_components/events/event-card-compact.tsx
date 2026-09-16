import Link from "next/link";
import { ArrowRight, Clock, MapPin, Users } from "lucide-react";
import { coursePath, eventPath } from "@/lib/slug";
import { Tag } from "@/app/_components/programmheft/tag";

interface CompactEventCardProps {
  id: string;
  slug?: string | null;
  title: string;
  date: Date;
  endDate?: Date;
  location: string;
  category: string;
  type: "event" | "course";
  openToParticipants?: boolean;
  cancelled?: boolean;
}

/**
 * Kompakte Programmzeile für Kalenderagenda-Listen. Nicht mehr im Einsatz
 * seit die Kalenderansicht Termine über `ProgrammeRow`/`programme-data.ts`
 * rendert — hier nur für den Fall belassen, dass eine einzelne kompakte
 * Zeile ohne den vollen `ProgrammeEntry`-Datensatz gebraucht wird.
 */
export default function CompactEventCard({
  id,
  slug,
  title,
  date,
  location,
  category,
  type,
  openToParticipants,
  cancelled,
}: CompactEventCardProps) {
  const dateObj = new Date(date);
  const time = dateObj.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Link
      href={
        type === "course" ? coursePath({ id, slug }) : eventPath({ id, slug })
      }
      className="fill-row border-rule dark:border-night-rule flex items-center gap-3 border-b px-1 py-3"
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          {cancelled && <Tag tone="cancelled">Abgesagt</Tag>}
          {openToParticipants && (
            <Tag tone="orange">
              <Users className="h-3 w-3 shrink-0" aria-hidden />
              Mitspielen
            </Tag>
          )}
        </div>
        <p
          className={`condensed text-sm leading-tight font-bold ${
            cancelled
              ? "text-dark dark:text-night-muted line-through"
              : "text-ink dark:text-night-text"
          }`}
        >
          {title}
        </p>
        <div className="text-dark dark:text-night-muted mt-1 flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 shrink-0" aria-hidden />
            {time}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
            {location}
          </span>
          <span>{category}</span>
        </div>
      </div>
      <ArrowRight
        aria-hidden
        className="text-ink dark:text-night-text h-4 w-4 shrink-0"
      />
    </Link>
  );
}
