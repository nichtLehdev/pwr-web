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

/**
 * Status, mit dem eine Bearbeitung gespeichert wird. Ohne Freigaberecht geht
 * Freigegebenes zurück in die Prüfung, auch wenn der Aufruf (z. B. über MCP)
 * keinen Status mitschickt. `undefined` heißt: Status bleibt.
 */
export function statusAfterEdit(
  current: ContentStatus,
  requested: ContentStatus | undefined,
  canApprove: boolean,
): ContentStatus | undefined {
  if (!canApprove && current === ContentStatus.APPROVED) {
    return ContentStatus.PENDING;
  }
  return requested;
}
