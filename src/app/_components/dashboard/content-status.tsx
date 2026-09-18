import type { ContentStatus } from "~/generated/prisma/enums";
import { Tag, type TagTone } from "@/app/_components/programmheft/tag";

/** Gemeinsam für Karten, Tabellen und Filter, damit ein Status überall gleich heißt. */
export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  DRAFT: "Entwurf",
  PENDING: "Zur Prüfung",
  APPROVED: "Veröffentlicht",
  REJECTED: "Abgelehnt",
  ARCHIVED: "Archiviert",
};

/**
 * Der Ton trägt die Dringlichkeit: gefüllt heißt „das musst du sehen", umrandet (`muted`)
 * nur „das ist der Stand" — Entwurf und Archiviert verlangen nichts.
 */
const CONTENT_STATUS_TONE: Record<ContentStatus, TagTone> = {
  DRAFT: "muted",
  PENDING: "orange",
  APPROVED: "ink",
  REJECTED: "cancelled",
  ARCHIVED: "muted",
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
    <Tag tone={CONTENT_STATUS_TONE[status]} className={className}>
      {CONTENT_STATUS_LABELS[status]}
    </Tag>
  );
}
