import Link from "next/link";
import { getDistrictColor } from "@/lib/district-color";
import type { ContentStatus, PostCategory } from "~/generated/prisma/client";

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
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
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

        {/* Reviewer */}
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
          href={`/dashboard/posts/${id}`}
          className="text-primary hover:text-primary-dark inline-flex items-center text-sm font-medium transition-colors"
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
          href={`/dashboard/posts/${id}/edit`}
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
          href={`/aktuelles/${id}`}
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
