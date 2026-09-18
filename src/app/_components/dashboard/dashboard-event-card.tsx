import Link from "next/link";
import { getDistrictColor } from "@/lib/district-color";
import { capitalizeFirstLetter, cn } from "@/lib/utils";
import type { ContentStatus } from "~/generated/prisma/enums";
import { Tag } from "@/app/_components/programmheft/tag";
import { ContentStatusBadge } from "./content-status";
import {
  Calendar,
  Eye,
  Edit,
  ExternalLink,
  MapPin,
  Tag as TagIcon,
  User,
} from "lucide-react";
import { eventPath } from "@/lib/slug";
import { formatBerlin } from "@/lib/berlin-time";

interface DashboardEventCardProps {
  id: string;
  slug?: string | null;
  title: string;
  date: Date;
  location: string;
  category: string;
  district?: number;
  status: ContentStatus;
  cancelled?: boolean;
  createdBy?: {
    id: string;
    displayName: string | null;
  } | null;
  createdAt?: Date;
}

export default function DashboardEventCard({
  id,
  slug,
  title,
  date,
  location,
  category,
  district,
  status,
  cancelled,
  createdBy,
  createdAt,
}: DashboardEventCardProps) {
  const districtColor = getDistrictColor(district);

  const creatorLine =
    createdBy &&
    `${createdBy.displayName || "Unbekannt"}${
      createdAt ? ` · ${formatBerlin(createdAt, "datumKurz")}` : ""
    }`;

  const districtLabel = district ? `Bezirk ${district}` : "Übergreifend";

  const metaIconClass =
    "text-dark dark:text-night-muted mt-0.5 h-4 w-4 shrink-0";

  const dateLabel = `${formatBerlin(date, "datumMonatKurzZweistellig")}, ${formatBerlin(date, "uhrzeit")}`;

  return (
    // Karte statt Kasten mit Rundung und Schatten — siehe DashboardCourseCard.
    <div
      className={cn(
        "border-rule dark:border-night-rule bg-paper dark:bg-night relative flex flex-col border p-4 pb-5",
        cancelled && "opacity-75",
      )}
    >
      <div className="mb-2.5 flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5">
          <ContentStatusBadge status={status} className="shrink-0" />
          {cancelled ? <Tag tone="cancelled">Abgesagt</Tag> : null}
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

      <h3
        className={cn(
          "semi-condensed text-ink dark:text-night-text mb-2.5 line-clamp-2 text-base leading-snug font-semibold sm:text-[1.0625rem]",
          cancelled && "text-dark dark:text-night-muted line-through",
        )}
      >
        {title}
      </h3>

      <div className="text-dark dark:text-night-muted mb-3 space-y-1.5 text-sm leading-snug">
        <div className="flex gap-2">
          <Calendar className={metaIconClass} aria-hidden />
          <span className="min-w-0">{dateLabel}</span>
        </div>
        {location ? (
          <div className="flex gap-2">
            <MapPin className={metaIconClass} aria-hidden />
            <span className="min-w-0 break-words">{location}</span>
          </div>
        ) : null}
        <div className="flex gap-2">
          <TagIcon className={metaIconClass} aria-hidden />
          <span>{capitalizeFirstLetter(category)}</span>
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
          href={`/dashboard/events/${id}`}
          // Orange als Textfarbe fällt auf Papier unter AA — Messing-Tinte
          // trägt denselben Akzent (nachts darf Orange selbst stehen).
          className="text-primary-ink dark:text-primary inline-flex min-h-11 items-center gap-1 text-sm font-medium whitespace-nowrap hover:underline"
        >
          <Eye className="h-3.5 w-3.5" />
          Ansehen
        </Link>

        <Link
          href={`/dashboard/events/${id}/edit`}
          className="text-dark dark:text-night-muted hover:text-ink dark:hover:text-night-text inline-flex min-h-11 items-center gap-1 text-sm whitespace-nowrap transition-colors"
        >
          <Edit className="h-3.5 w-3.5" />
          Bearbeiten
        </Link>

        <Link
          href={eventPath({ id, slug })}
          className="text-dark dark:text-night-muted hover:text-primary-ink dark:hover:text-primary ml-auto inline-flex min-h-11 min-w-11 items-center justify-center transition-colors"
          target="_blank"
          rel="noopener noreferrer"
          title="Öffentliche Terminseite"
          aria-label="Öffentliche Terminseite öffnen"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
