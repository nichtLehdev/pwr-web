import { ContentStatus } from "~/generated/prisma/client";

/**
 * Statuswechsel, die ein Autor ohne Freigabe-Berechtigung selbst fahren darf.
 * `APPROVED`/`REJECTED` ist die Freigabe selbst und bleibt der Redaktion vorbehalten.
 */
export function authorMayChangeStatus(
  from: ContentStatus,
  to: ContentStatus,
): boolean {
  if (from === to) return true;
  if (
    to === ContentStatus.PENDING &&
    (from === ContentStatus.DRAFT || from === ContentStatus.REJECTED)
  ) {
    return true;
  }
  return to === ContentStatus.DRAFT && from === ContentStatus.REJECTED;
}

/** Beim Bearbeiten zusätzlich: Freigegebenes geht durch die Änderung zurück in die Prüfung. */
export function authorMaySaveStatus(
  from: ContentStatus,
  to: ContentStatus,
): boolean {
  return (
    authorMayChangeStatus(from, to) ||
    (from === ContentStatus.APPROVED && to === ContentStatus.PENDING)
  );
}
