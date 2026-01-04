import Link from "next/link";
import { getDistrictColor } from "@/lib/district-color";
import { capitalizeFirstLetter } from "@/lib/utils";
import type { ContentStatus } from "~/generated/prisma/client";
import {
  CalendarIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  EyeIcon,
  MapPinIcon,
  PencilIcon,
  TagIcon,
  UserIcon,
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
  reviewer?: {
    id: string;
    displayName: string | null;
  } | null;
  reviewDate?: Date | null;
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
  reviewer,
  reviewDate,
}: DashboardEventCardProps) {
  const districtColor = getDistrictColor(district);
  const statusInfo = statusConfig[status];

  return (
    <div
      className={`dark:border-dark-border dark:bg-dark-surface relative flex h-full flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md ${
        cancelled ? "opacity-75" : ""
      }`}
    >
      {/* Top Row: Status & District */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Badge */}
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusInfo.bgColor} ${statusInfo.textColor}`}
          >
            {statusInfo.label}
          </span>

          {/* Cancelled Badge */}
          {cancelled && (
            <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">
              Abgesagt
            </span>
          )}
        </div>

        {/* District Badge */}
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
          style={{ backgroundColor: districtColor }}
        >
          {district ? `Bezirk ${district}` : "Übergreifend"}
        </span>
      </div>

      {/* Title */}
      <h3
        className={`text-dark dark:text-dark-text mb-2 line-clamp-2 text-lg font-bold ${
          cancelled ? "text-gray-500 line-through dark:text-gray-400" : ""
        }`}
      >
        {title}
      </h3>

      {/* Meta Info */}
      <div className="mb-3 space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 shrink-0" />
          <span>
            {date.toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
            {", "}
            {date.toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <MapPinIcon className="h-4 w-4 shrink-0" />
          <span>{location || "Kein Ort angegeben"}</span>
        </div>

        <div className="flex items-center gap-2">
          <TagIcon className="h-4 w-4 shrink-0" />
          <span>{capitalizeFirstLetter(category)}</span>
        </div>

        {createdBy && (
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {createdBy.displayName || "Unbekannt"}
              {createdAt && (
                <span className="text-gray-400 dark:text-gray-500">
                  {" "}
                  •{" "}
                  {new Date(createdAt).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                  })}
                </span>
              )}
            </span>
          </div>
        )}

        {reviewer && (
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {reviewer.displayName || "Unbekannt"}
              {reviewDate && (
                <span className="text-gray-400 dark:text-gray-500">
                  {" "}
                  •{" "}
                  {new Date(reviewDate).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                  })}
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-auto flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
        <Link
          href={`/dashboard/events/${id}`}
          className="text-primary hover:text-primary-dark inline-flex items-center text-sm font-medium transition-colors"
        >
          <EyeIcon className="h-4 w-4 shrink-0" />
          Ansehen
        </Link>

        <Link
          href={`/dashboard/events/${id}/edit`}
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <PencilIcon className="h-4 w-4 shrink-0" />
          Bearbeiten
        </Link>

        <Link
          href={`/termine/event/${id}`}
          className="ml-auto inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          target="_blank"
        >
          <ExternalLinkIcon className="h-4 w-4 shrink-0" />
          Öffentlich
        </Link>
      </div>
    </div>
  );
}
