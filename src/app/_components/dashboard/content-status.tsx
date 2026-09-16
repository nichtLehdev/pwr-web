import type { ContentStatus } from "~/generated/prisma/enums";
import { Tag, type TagTone } from "@/app/_components/programmheft/tag";

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

/**
 * Der Ton trägt die Dringlichkeit, nicht die Identität — den Namen des
 * Zustands liest man ohnehin.
 *
 * Gefüllt heißt „das musst du sehen": Zur Prüfung wartet auf dich (Orange),
 * Veröffentlicht ist live (Tinte), Abgelehnt ist ein negativer Abschluss
 * (Rot). Umrandet heißt „das ist nur der Stand": Entwurf und Archiviert
 * verlangen nichts von dir und teilen sich deshalb den zurückgenommenen Ton.
 *
 * Vorher lagen Entwurf, Abgelehnt und Archiviert alle auf `inverse` und waren
 * damit ununterscheidbar — „Abgelehnt" verlor seine Bedeutung. Dafür hat
 * `Tag` den umrandeten `muted`-Ton bekommen.
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
