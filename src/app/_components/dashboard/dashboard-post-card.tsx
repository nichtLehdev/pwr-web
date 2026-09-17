import Link from "next/link";
import { getDistrictColor } from "@/lib/district-color";
import type { ContentStatus, PostCategory } from "~/generated/prisma/client";
import { Tag } from "@/app/_components/programmheft/tag";
import { ContentStatusBadge } from "./content-status";
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

const categoryLabels: Record<PostCategory, string> = {
  MAGAZIN: "Magazin",
  EVENT: "Event",
  AUSBILDUNG: "Ausbildung",
  BEZIRKE: "Bezirke",
  ANDERE: "Andere",
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
  const metaIconClass =
    "text-dark dark:text-night-muted mt-0.5 h-4 w-4 shrink-0";

  return (
    // Karte statt Kasten mit Rundung und Schatten — siehe DashboardCourseCard.
    <div className="border-rule dark:border-night-rule bg-paper dark:bg-night relative flex h-full flex-col border p-4 pb-5">
      {/* Top Row: Status & Pinned */}
      <div className="mb-2.5 flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5">
          <ContentStatusBadge status={status} className="shrink-0" />

          {pinned && (
            // Orange als Hervorhebung: „Gepinnt" stand als gefülltes Etikett
            // direkt neben „Veröffentlicht" und sah im Hellmodus identisch aus
            // — zwei schwarze Blöcke nebeneinander, unterscheidbar nur am Wort.
            <Tag tone="orange" className="gap-1">
              <PinIcon className="h-3 w-3" />
              Gepinnt
            </Tag>
          )}
        </div>
        <span
          className="text-ink dark:text-night-text inline-flex shrink-0 items-center gap-1.5 text-xs leading-none font-medium whitespace-nowrap"
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
      <h3 className="semi-condensed text-ink dark:text-night-text mb-3.5 line-clamp-2 text-base leading-snug font-semibold sm:text-[1.0625rem]">
        {title}
      </h3>

      {/* Excerpt */}
      {excerpt && (
        <p className="text-dark dark:text-night-muted mb-3 line-clamp-2 text-sm leading-snug">
          {excerpt}
        </p>
      )}

      {/* Meta Info */}
      <div className="text-dark dark:text-night-muted mb-3 space-y-1.5 text-sm leading-snug">
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
          <span>{categoryLabels[category]}</span>
        </div>

        {/* Created By */}
        {createdBy && (
          <div className="flex items-center gap-2">
            <UserIcon className={metaIconClass} />
            <span className="truncate">
              {createdBy.displayName || "Unbekannt"}
              {createdAt && (
                <span>
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
                <span>
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
      <div className="border-rule dark:border-night-rule mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t pt-3.5">
        <Link
          href={`/dashboard/posts/${id}`}
          // Orange als Textfarbe fällt auf Papier unter AA — Messing-Tinte
          // trägt denselben Akzent (nachts darf Orange selbst stehen).
          className="text-primary-ink dark:text-primary inline-flex min-h-11 items-center gap-1 text-sm font-medium whitespace-nowrap hover:underline"
        >
          <EyeIcon className="h-3.5 w-3.5" />
          Ansehen
        </Link>

        <Link
          href={`/dashboard/posts/${id}/edit`}
          className="text-dark dark:text-night-muted hover:text-ink dark:hover:text-night-text inline-flex min-h-11 items-center gap-1 text-sm whitespace-nowrap transition-colors"
        >
          <PencilIcon className="h-3.5 w-3.5" />
          Bearbeiten
        </Link>

        <Link
          href={`/aktuelles/${id}`}
          className="text-dark dark:text-night-muted hover:text-primary-ink dark:hover:text-primary ml-auto inline-flex min-h-11 min-w-11 items-center justify-center transition-colors"
          target="_blank"
          rel="noopener noreferrer"
          title="Öffentlicher Beitrag"
          aria-label="Öffentlichen Beitrag öffnen"
        >
          <ExternalLinkIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
