import type { ContentStatus } from "~/generated/prisma/enums";

/**
 * Ein Freigabestatus, eine Beschriftung, eine Farbe — Karten, Tabellen und
 * Filterlisten der Übersichten greifen auf dieselbe Tabelle zu, damit derselbe
 * Status nicht je nach Ansicht anders heißt.
 */
export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  DRAFT: "Entwurf",
  PENDING: "Zur Prüfung",
  APPROVED: "Veröffentlicht",
  REJECTED: "Abgelehnt",
  ARCHIVED: "Archiviert",
};

export const CONTENT_STATUS_BADGE_CLASSES: Record<ContentStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  PENDING:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  APPROVED:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  ARCHIVED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

/** Set-Filter-Optionen für eine Statusspalte. */
export const CONTENT_STATUS_OPTIONS = (
  Object.keys(CONTENT_STATUS_LABELS) as ContentStatus[]
).map((value) => ({ value, label: CONTENT_STATUS_LABELS[value] }));

export function ContentStatusBadge({
  status,
  className,
}: {
  status: ContentStatus;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${CONTENT_STATUS_BADGE_CLASSES[status]} ${className ?? ""}`}
    >
      {CONTENT_STATUS_LABELS[status]}
    </span>
  );
}
