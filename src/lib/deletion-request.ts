import { districtAllowed, type DistrictScope } from "@/lib/district-scope";

export type DeletionContentType = "post" | "event" | "course";

export const DELETION_CONTENT_LABELS: Record<DeletionContentType, string> = {
  post: "Beitrag",
  event: "Veranstaltung",
  course: "Kurs",
};

export const DELETION_REASON_MAX_LENGTH = 2000;

/**
 * Wer selbst löschen darf, braucht keinen Antrag. Beantragen darf, wer den Inhalt
 * im eigenen Zuständigkeitsbereich sieht – dieselbe Regel wie beim Lesen von Entwürfen.
 */
export function deletionRequestAccess(params: {
  isOwner: boolean;
  hasDeletePermission: boolean;
  hasViewPermission: boolean;
  scope: DistrictScope;
  bezirkId: string | null;
}): { canDelete: boolean; canRequest: boolean } {
  const canDelete = params.isOwner || params.hasDeletePermission;
  const canRequest =
    !canDelete &&
    params.hasViewPermission &&
    districtAllowed(params.scope, params.bezirkId);
  return { canDelete, canRequest };
}
