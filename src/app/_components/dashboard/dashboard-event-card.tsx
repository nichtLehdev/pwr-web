import Link from "next/link";
import { getDistrictColor } from "@/lib/district-color";
import { capitalizeFirstLetter } from "@/lib/utils";
import type { ContentStatus } from "~/generated/prisma/enums";
import {
  Calendar,
  Eye,
  Edit,
  ExternalLink,
  MapPin,
  Tag,
  User,
} from "lucide-react";

interface DashboardEventCardProps {
  id: string;
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

const statusConfig: Record<
  ContentStatus,
  { label: string; bgColor: string; textColor: string }
> = {
  DRAFT: {
    label: "Entwurf",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    textColor: "text-gray-700 dark:text-gray-300",
  },
  PENDING: {
    label: "Zur Prüfung",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    textColor: "text-yellow-800 dark:text-yellow-300",
  },
  APPROVED: {
    label: "Veröffentlicht",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    textColor: "text-green-800 dark:text-green-300",
  },
  REJECTED: {
    label: "Abgelehnt",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    textColor: "text-red-800 dark:text-red-300",
  },
  ARCHIVED: {
    label: "Archiviert",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    textColor: "text-gray-600 dark:text-gray-400",
  },
};

export default function DashboardEventCard({
  id,
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
  const statusInfo = statusConfig[status];

  const creatorLine =
    createdBy &&
    `${createdBy.displayName || "Unbekannt"}${
      createdAt
        ? ` · ${new Date(createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })}`
        : ""
    }`;

  const districtLabel = district ? `Bezirk ${district}` : "Übergreifend";

  const metaIconClass =
    "mt-0.5 h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500";

  const dateLabel = `${date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}, ${date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  return (
    <div
      className={`dark:border-dark-border dark:bg-dark-surface relative flex flex-col rounded-lg border border-gray-200/80 bg-white p-4 pb-5 shadow-sm transition-shadow hover:shadow-md dark:shadow-none ${
        cancelled ? "opacity-75" : ""
      }`}
    >
      <div className="mb-2.5 flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5">
          <span
            className={`inline-flex max-w-full shrink-0 items-center rounded-md px-2 py-1 text-xs font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}
          >
            <span className="truncate">{statusInfo.label}</span>
          </span>
          {cancelled ? (
            <span className="inline-flex shrink-0 rounded-md bg-red-600/12 px-2 py-1 text-xs font-medium text-red-800 dark:text-red-300">
              Abgesagt
            </span>
          ) : null}
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1.5 text-xs leading-none font-medium whitespace-nowrap text-gray-700 dark:text-gray-300"
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
        className={`text-dark dark:text-dark-text mb-2.5 line-clamp-2 text-base leading-snug font-semibold tracking-tight sm:text-[1.0625rem] ${
          cancelled ? "text-gray-500 line-through dark:text-gray-400" : ""
        }`}
      >
        {title}
      </h3>

      <div className="mb-3 space-y-1.5 text-sm leading-snug text-gray-600 dark:text-gray-400">
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
          <Tag className={metaIconClass} aria-hidden />
          <span>{capitalizeFirstLetter(category)}</span>
        </div>
      </div>

      {creatorLine ? (
        <p className="mb-3 flex items-center gap-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
          <User
            className="size-[0.9375rem] shrink-0 text-gray-400 dark:text-gray-500"
            aria-hidden
            strokeWidth={1.75}
          />
          <span className="min-w-0 break-words">{creatorLine}</span>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-gray-100 pt-3.5 dark:border-gray-700/60">
        <Link
          href={`/dashboard/events/${id}`}
          className="text-primary hover:text-primary-dark inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap transition-colors"
        >
          <Eye className="h-3.5 w-3.5" />
          Ansehen
        </Link>

        <Link
          href={`/dashboard/events/${id}/edit`}
          className="inline-flex items-center gap-1 text-sm whitespace-nowrap text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <Edit className="h-3.5 w-3.5" />
          Bearbeiten
        </Link>

        <Link
          href={`/termine/event/${id}`}
          className="hover:text-primary dark:hover:text-primary ml-auto inline-flex items-center text-gray-500 transition-colors dark:text-gray-500"
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
