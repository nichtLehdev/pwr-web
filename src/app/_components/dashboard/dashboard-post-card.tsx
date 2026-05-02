import Link from "next/link";
import { getDistrictColor } from "@/lib/district-color";
import type { ContentStatus, PostCategory } from "~/generated/prisma/client";
import {
  CalendarIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  EyeIcon,
  PencilIcon,
  PinIcon,
  TagIcon,
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
  const metaIconClass =
    "mt-0.5 h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500";

  return (
    <div className="dark:border-dark-border dark:bg-dark-surface relative flex h-full flex-col rounded-lg border border-gray-200/80 bg-white p-4 pb-5 shadow-sm transition-shadow hover:shadow-md dark:shadow-none">
      {/* Top Row: Status & Pinned */}
      <div className="mb-2.5 flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5">
          {/* Status Badge */}
          <span
            className={`inline-flex max-w-full shrink-0 items-center rounded-md px-2 py-1 text-xs font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}
          >
            {statusInfo.label}
          </span>

          {/* Pinned Badge */}
          {pinned && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              <PinIcon className="h-3 w-3 text-amber-800 dark:text-amber-300" />
              Gepinnt
            </span>
          )}
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1.5 text-xs leading-none font-medium whitespace-nowrap text-gray-700 dark:text-gray-300"
          title={district ? `Bezirk ${district}` : "Übergreifend"}
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: districtColor }}
            aria-hidden
          />
          <span className="leading-none">
            {district ? `Bezirk ${district}` : "Übergreifend"}
          </span>
        </span>
      </div>

      {/* Title */}
      <h3 className="text-dark dark:text-dark-text mb-3.5 line-clamp-2 text-base leading-snug font-semibold tracking-tight sm:text-[1.0625rem]">
        {title}
      </h3>

      {/* Excerpt */}
      {excerpt && (
        <p className="mb-3 line-clamp-2 text-sm leading-snug text-gray-600 dark:text-gray-400">
          {excerpt}
        </p>
      )}

      {/* Meta Info */}
      <div className="mb-3 space-y-1.5 text-sm leading-snug text-gray-600 dark:text-gray-400">
        {/* Published Date */}
        {publishedAt && (
          <div className="flex items-center gap-2">
            <CalendarIcon className={metaIconClass} />
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

        <div className="flex items-center gap-2">
          <TagIcon className={metaIconClass} />
          <span>{categoryInfo.label}</span>
        </div>

        {/* Created By */}
        {createdBy && (
          <div className="flex items-center gap-2">
            <UserIcon className={metaIconClass} />
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
            <CheckCircleIcon className={metaIconClass} />
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
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-gray-100 pt-3.5 dark:border-gray-700/60">
        <Link
          href={`/dashboard/posts/${id}`}
          className="text-primary hover:text-primary-dark inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap transition-colors"
        >
          <EyeIcon className="h-3.5 w-3.5" />
          Ansehen
        </Link>

        <Link
          href={`/dashboard/posts/${id}/edit`}
          className="inline-flex items-center gap-1 text-sm whitespace-nowrap text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <PencilIcon className="h-3.5 w-3.5" />
          Bearbeiten
        </Link>

        <Link
          href={`/aktuelles/${id}`}
          className="hover:text-primary dark:hover:text-primary ml-auto inline-flex items-center text-gray-500 transition-colors dark:text-gray-500"
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLinkIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
