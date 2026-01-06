import Link from "next/link";
import { getDistrictColor } from "@/lib/district-color";
import type { ContentStatus, CourseType } from "~/generated/prisma/enums";
import {
  Calendar,
  MapPin,
  Tag,
  Users,
  User,
  CheckCircle,
  Eye,
  Edit,
  ExternalLink,
} from "lucide-react";

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
  registrationOpensAt?: Date | null;
  registrationDeadline?: Date | null;
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
  registrationOpensAt,
  registrationDeadline,
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
  const isDeadlinePassed = registrationDeadline
    ? new Date(registrationDeadline) < new Date()
    : false;
  const isRegistrationNotOpenYet =
    registrationOpensAt && new Date(registrationOpensAt) > new Date();
  const isEffectivelyOpen =
    registrationOpen &&
    !isDeadlinePassed &&
    !isRegistrationNotOpenYet;

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
    <div className="dark:border-dark-border dark:bg-dark-surface relative flex h-full flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
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
          {isRegistrationNotOpenYet && registrationOpen ? (
            <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
              Öffnet{" "}
              {registrationOpensAt?.toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "short",
              })}
            </span>
          ) : isEffectivelyOpen ? (
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              Offen
            </span>
          ) : (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {isDeadlinePassed ? "Frist vorbei" : "Geschlossen"}
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
      <h3 className="text-dark dark:text-dark-text mb-2 line-clamp-2 text-lg font-bold">
        {title}
      </h3>

      {/* Meta Info */}
      <div className="mb-3 space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0" />
          <span>{formatDateRange()}</span>
        </div>

        {location && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{location}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 shrink-0" />
          <span>{courseTypeLabels[courseType]}</span>
        </div>

        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 shrink-0" />
          <span>
            {confirmedCount}
            {maxParticipants && ` / ${maxParticipants}`} Teilnehmer
          </span>
        </div>

        {createdBy && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 shrink-0" />
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
            <CheckCircle className="h-4 w-4 shrink-0" />
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
          className="text-primary hover:text-primary-dark inline-flex items-center text-sm font-medium transition-colors"
        >
          <Eye className="mr-1 h-4 w-4" />
          Ansehen
        </Link>

        <Link
          href={`/dashboard/courses/${id}/edit`}
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <Edit className="mr-1 h-4 w-4" />
          Bearbeiten
        </Link>

        <Link
          href={`/dashboard/courses/${id}/participants`}
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <Users className="mr-1 h-4 w-4" />
          Teilnehmer
        </Link>

        <Link
          href={`/mitmachen/kurse/${id}`}
          className="ml-auto inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          target="_blank"
        >
          <ExternalLink className="mr-1 h-4 w-4" />
          Öffentlich
        </Link>
      </div>
    </div>
  );
}
