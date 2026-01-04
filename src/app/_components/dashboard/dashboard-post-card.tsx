import Link from "next/link";
import { getDistrictColor } from "@/lib/district-color";
import type { ContentStatus, PostCategory } from "~/generated/prisma/client";
import {
  CalendarIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  EyeIcon,
  MapPinIcon,
  PencilIcon,
  PinIcon,
  UserIcon,
} from "lucide-react";

interface DashboardPostCardProps {
  id: string;
  title: string;
  excerpt?: string | null;
  category: PostCategory;
  district?: number;
  status: ContentStatus;
  pinned?: boolean;
  createdBy?: {
    id: string;
    displayName: string | null;
  } | null;
  createdAt?: Date;
  publishedAt?: Date | null;
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

const categoryConfig: Record<
  PostCategory,
  { label: string; bgColor: string; textColor: string }
> = {
  MAGAZIN: {
    label: "Magazin",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
    textColor: "text-indigo-800 dark:text-indigo-300",
  },
  EVENT: {
    label: "Event",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    textColor: "text-purple-800 dark:text-purple-300",
  },
  AUSBILDUNG: {
    label: "Ausbildung",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-800 dark:text-blue-300",
  },
  BEZIRKE: {
    label: "Bezirke",
    bgColor: "bg-teal-100 dark:bg-teal-900/30",
    textColor: "text-teal-800 dark:text-teal-300",
  },
  ANDERE: {
    label: "Andere",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    textColor: "text-gray-700 dark:text-gray-300",
  },
};

export default function DashboardPostCard({
  id,
  title,
  excerpt,
  category,
  district,
  status,
  pinned,
  createdBy,
  createdAt,
  publishedAt,
  reviewer,
  reviewDate,
}: DashboardPostCardProps) {
  const districtColor = getDistrictColor(district);
  const statusInfo = statusConfig[status];
  const categoryInfo = categoryConfig[category];

  return (
    <div className="dark:border-dark-border dark:bg-dark-surface relative flex h-full flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
      {/* Top Row: Status & Category */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Badge */}
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusInfo.bgColor} ${statusInfo.textColor}`}
          >
            {statusInfo.label}
          </span>

          {/* Pinned Badge */}
          {pinned && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              <PinIcon className="h-3 w-3 text-amber-800 dark:text-amber-300" />
              Gepinnt
            </span>
          )}
        </div>

        {/* Category Badge */}
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${categoryInfo.bgColor} ${categoryInfo.textColor}`}
        >
          {categoryInfo.label}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-dark dark:text-dark-text mb-2 line-clamp-2 text-lg font-bold">
        {title}
      </h3>

      {/* Excerpt */}
      {excerpt && (
        <p className="mb-3 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
          {excerpt}
        </p>
      )}

      {/* Meta Info */}
      <div className="mb-3 space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
        {/* District */}
        {district !== undefined && (
          <div className="flex items-center gap-2">
            <MapPinIcon className="h-4 w-4 shrink-0 text-gray-600 dark:text-gray-400" />
            <span
              className="rounded px-1.5 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: districtColor }}
            >
              {district ? `Bezirk ${district}` : "Übergreifend"}
            </span>
          </div>
        )}

        {/* Published Date */}
        {publishedAt && (
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 shrink-0" />
            <span>
              Veröffentlicht:{" "}
              {new Date(publishedAt).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        )}

        {/* Created By */}
        {createdBy && (
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 shrink-0 text-gray-600 dark:text-gray-400" />
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

        {/* Reviewer */}
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
          href={`/dashboard/posts/${id}`}
          className="text-primary hover:text-primary-dark inline-flex items-center text-sm font-medium transition-colors"
        >
          <EyeIcon className="h-4 w-4 shrink-0" />
          Ansehen
        </Link>

        <Link
          href={`/dashboard/posts/${id}/edit`}
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <PencilIcon className="h-4 w-4 shrink-0" />
          Bearbeiten
        </Link>

        <Link
          href={`/aktuelles/${id}`}
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
