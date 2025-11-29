import Link from "next/link";
import { getDistrictColor } from "@/lib/district-color";
import type { ContentStatus, CourseType, RegistrationStatus } from "~/generated/prisma/enums";

interface DashboardCourseCardProps {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string | null;
  courseType: CourseType;
  district?: number;
  status: ContentStatus;
  registrationOpen: boolean;
  maxParticipants?: number | null;
  confirmedCount: number;
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

const courseTypeLabels: Record<CourseType, string> = {
  LEHRGANG: "Lehrgang",
  FREIZEIT: "Freizeit",
  WORKSHOP: "Workshop",
  KOMPONISTENPORTRAIT: "Komponistenportrait",
  OTHER: "Sonstiges",
};

export default function DashboardCourseCard({
  id,
  title,
  startDate,
  endDate,
  location,
  courseType,
  district,
  status,
  registrationOpen,
  maxParticipants,
  confirmedCount,
  createdBy,
  createdAt,
  reviewer,
  reviewDate,
}: DashboardCourseCardProps) {
  const districtColor = getDistrictColor(district);
  const statusInfo = statusConfig[status];
  const isFull = maxParticipants ? confirmedCount >= maxParticipants : false;

  // Format date range
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

  return (
    <div className="relative flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-dark-border dark:bg-dark-surface">
      {/* Top Row: Status & District */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Badge */}
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusInfo.bgColor} ${statusInfo.textColor}`}
          >
            {statusInfo.label}
          </span>

          {/* Registration Status */}
          {registrationOpen ? (
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              Anmeldung offen
            </span>
          ) : (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              Anmeldung geschlossen
            </span>
          )}

          {isFull && (
            <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
              Ausgebucht
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
      <h3 className="mb-2 text-lg font-bold text-dark dark:text-dark-text">
        {title}
      </h3>

      {/* Meta Info */}
      <div className="mb-3 space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 shrink-0"
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
          <span>{formatDateRange()}</span>
        </div>

        {location && (
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 shrink-0"
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
            <span>{location}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          <span>{courseTypeLabels[courseType]}</span>
        </div>

        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 shrink-0"
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
          <span>
            {confirmedCount}
            {maxParticipants && ` / ${maxParticipants}`} Teilnehmer
          </span>
        </div>

        {createdBy && (
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
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
            <svg
              className="h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
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
          href={`/dashboard/courses/${id}`}
          className="inline-flex items-center text-sm font-medium text-primary transition-colors hover:text-primary-dark"
        >
          <svg
            className="mr-1 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          Ansehen
        </Link>

        <Link
          href={`/dashboard/courses/${id}/edit`}
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg
            className="mr-1 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          Bearbeiten
        </Link>

        <Link
          href={`/dashboard/courses/${id}/participants`}
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg
            className="mr-1 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Teilnehmer
        </Link>

        <Link
          href={`/mitmachen/kurse/${id}`}
          className="ml-auto inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          target="_blank"
        >
          <svg
            className="mr-1 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          Öffentlich
        </Link>
      </div>
    </div>
  );
}
