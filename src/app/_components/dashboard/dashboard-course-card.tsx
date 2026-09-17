import Link from "next/link";
import { getDistrictColor } from "@/lib/district-color";
import { coursePath } from "@/lib/slug";
import type { ContentStatus, CourseType } from "~/generated/prisma/enums";
import { Tag } from "@/app/_components/programmheft/tag";
import { ContentStatusBadge } from "./content-status";
import {
  Calendar,
  MapPin,
  Tag as TagIcon,
  Users,
  User,
  Eye,
  Edit,
  ExternalLink,
} from "lucide-react";

interface DashboardCourseCardProps {
  id: string;
  slug?: string | null;
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string | null;
  courseType: CourseType;
  district?: number;
  status: ContentStatus;
  registrationOpen: boolean;
  registrationOpensAt?: Date | null;
  registrationDeadline?: Date | null;
  maxParticipants?: number | null;
  confirmedCount: number;
  createdBy?: {
    id: string;
    displayName: string | null;
  } | null;
  createdAt?: Date;
}

const courseTypeLabels: Record<CourseType, string> = {
  LEHRGANG: "Lehrgang",
  FREIZEIT: "Freizeit",
  WORKSHOP: "Workshop",
  KOMPONISTENPORTRAIT: "Komponistenportrait",
  VERANSTALTUNG: "Veranstaltung",
  OTHER: "Sonstiges",
};

export default function DashboardCourseCard({
  id,
  slug,
  title,
  startDate,
  endDate,
  location,
  courseType,
  district,
  status,
  registrationOpen,
  registrationOpensAt,
  registrationDeadline,
  maxParticipants,
  confirmedCount,
  createdBy,
  createdAt,
}: DashboardCourseCardProps) {
  const districtColor = getDistrictColor(district);
  const isFull = maxParticipants ? confirmedCount >= maxParticipants : false;
  const isDeadlinePassed = registrationDeadline
    ? new Date(registrationDeadline) < new Date()
    : false;
  const isRegistrationNotOpenYet =
    registrationOpensAt && new Date(registrationOpensAt) > new Date();
  const isEffectivelyOpen =
    registrationOpen && !isDeadlinePassed && !isRegistrationNotOpenYet;

  const formatDateRange = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startStr = start.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "short",
    });
    const endStr = end.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return `${startStr} - ${endStr}`;
  };

  const creatorLine =
    createdBy &&
    `${createdBy.displayName || "Unbekannt"}${
      createdAt
        ? ` · ${new Date(createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })}`
        : ""
    }`;

  const districtLabel = district ? `Bezirk ${district}` : "Übergreifend";

  const metaIconClass =
    "text-dark dark:text-night-muted mt-0.5 h-4 w-4 shrink-0";

  return (
    // Karte statt Kasten mit Rundung und Schatten: eine Haarlinie umschließt
    // sie, wie es die Übersetzungstabelle für Karten/Tabellen vorsieht. Die
    // Grammatik der öffentlichen Listen (Haarlinie, Tinte auf Papier) kommt
    // mit, ihre großen Editorial-Maße (Programm-Zeilen, py-5 etc.) nicht —
    // das Dashboard bleibt dicht.
    <div className="border-rule dark:border-night-rule bg-paper dark:bg-night relative flex flex-col border p-4 pb-5">
      <div className="mb-2.5 flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5">
          <ContentStatusBadge status={status} className="shrink-0" />
          {isRegistrationNotOpenYet && registrationOpen ? (
            <Tag tone="inverse">
              Öffnet{" "}
              {registrationOpensAt?.toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "short",
              })}
            </Tag>
          ) : isEffectivelyOpen ? (
            <Tag tone="ink">Anmeldung offen</Tag>
          ) : (
            // Geschlossene Anmeldung verlangt nichts mehr — umrandet statt
            // gefüllt. Gefüllt sahen „Anmeldung offen" und „Frist vorbei" im
            // Hellmodus identisch aus (beide Tinte auf Papier), der Zustand
            // war nur am Wort ablesbar.
            <Tag tone="muted">
              {isDeadlinePassed ? "Frist vorbei" : "Anmeldung zu"}
            </Tag>
          )}
          {isFull ? <Tag tone="orange">Ausgebucht</Tag> : null}
        </div>
        <span
          className="text-ink dark:text-night-text inline-flex shrink-0 items-center gap-1.5 text-xs leading-none font-medium whitespace-nowrap"
          title={districtLabel}
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: districtColor }}
            aria-hidden
          />
          <span className="leading-none">{districtLabel}</span>
        </span>
      </div>

      <h3 className="semi-condensed text-ink dark:text-night-text mb-2.5 line-clamp-2 text-base leading-snug font-semibold sm:text-[1.0625rem]">
        {title}
      </h3>

      <div className="text-dark dark:text-night-muted mb-3 space-y-1.5 text-sm leading-snug">
        <div className="flex gap-2">
          <Calendar className={metaIconClass} aria-hidden />
          <span className="min-w-0">{formatDateRange()}</span>
        </div>
        {location ? (
          <div className="flex gap-2">
            <MapPin className={metaIconClass} aria-hidden />
            <span className="min-w-0 break-words">{location}</span>
          </div>
        ) : null}
        <div className="flex gap-2">
          <TagIcon className={metaIconClass} aria-hidden />
          <span>{courseTypeLabels[courseType]}</span>
        </div>
        <div className="flex gap-2">
          <Users className={metaIconClass} aria-hidden />
          <span>
            {confirmedCount}
            {maxParticipants != null ? ` / ${maxParticipants}` : ""} Teilnehmer
          </span>
        </div>
      </div>

      {creatorLine ? (
        <p className="text-dark dark:text-night-muted mb-3 flex items-center gap-2 text-xs leading-normal">
          <User
            className="size-[0.9375rem] shrink-0"
            aria-hidden
            strokeWidth={1.75}
          />
          <span className="min-w-0 break-words">{creatorLine}</span>
        </p>
      ) : null}

      <div className="border-rule dark:border-night-rule flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t pt-3.5">
        <Link
          href={`/dashboard/courses/${id}`}
          // Orange als Textfarbe fällt auf Papier unter AA — Messing-Tinte
          // trägt denselben Akzent (nachts darf Orange selbst stehen).
          className="text-primary-ink dark:text-primary inline-flex min-h-11 items-center gap-1 text-sm font-medium whitespace-nowrap hover:underline"
        >
          <Eye className="h-3.5 w-3.5" />
          Ansehen
        </Link>

        <Link
          href={`/dashboard/courses/${id}/edit`}
          className="text-dark dark:text-night-muted hover:text-ink dark:hover:text-night-text inline-flex min-h-11 items-center gap-1 text-sm whitespace-nowrap transition-colors"
        >
          <Edit className="h-3.5 w-3.5" />
          Bearbeiten
        </Link>

        <Link
          href={`/dashboard/courses/${id}/participants`}
          className="text-dark dark:text-night-muted hover:text-ink dark:hover:text-night-text inline-flex min-h-11 items-center gap-1 text-sm whitespace-nowrap transition-colors"
        >
          <Users className="h-3.5 w-3.5" />
          Teilnehmer
        </Link>

        <Link
          href={coursePath({ id, slug })}
          className="text-dark dark:text-night-muted hover:text-primary-ink dark:hover:text-primary ml-auto inline-flex min-h-11 min-w-11 items-center justify-center transition-colors"
          target="_blank"
          rel="noopener noreferrer"
          title="Öffentliche Kursseite"
          aria-label="Öffentliche Kursseite öffnen"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
