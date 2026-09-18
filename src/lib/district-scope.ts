import { TRPCError } from "@trpc/server";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions";

/**
 * Bezirks-Zuschnitt: Wer freigeben darf (`*.approve`), arbeitet bezirksübergreifend,
 * alle anderen nur im eigenen Bezirk. Hängt an der Berechtigung, nicht am Rollennamen.
 */
export type ContentResource = "events" | "posts" | "courses";

export type DistrictScope =
  { unrestricted: true } | { unrestricted: false; bezirkIds: string[] };

const APPROVE_PERMISSION: Record<ContentResource, PermissionKey> = {
  events: PERMISSIONS.EVENTS_APPROVE,
  posts: PERMISSIONS.POSTS_APPROVE,
  courses: PERMISSIONS.COURSES_APPROVE,
};

/** Bewusst eine Liste: eine Person kann für mehrere Bezirke zuständig sein. */
export function districtScopeFor(
  perms: Set<PermissionKey>,
  resource: ContentResource,
  scopedBezirkIds: readonly string[],
): DistrictScope {
  if (perms.has(APPROVE_PERMISSION[resource])) return { unrestricted: true };
  return { unrestricted: false, bezirkIds: [...scopedBezirkIds] };
}

/**
 * `null` („Übergreifend“) bleibt der Redaktion vorbehalten: ohne Bezirk
 * erscheint der Inhalt unter jedem Bezirksfilter.
 */
export function districtAllowed(
  scope: DistrictScope,
  bezirkId: string | null | undefined,
): boolean {
  if (scope.unrestricted) return true;
  if (!bezirkId) return false;
  return scope.bezirkIds.includes(bezirkId);
}

export function assertDistrictAllowed(
  scope: DistrictScope,
  bezirkId: string | null | undefined,
): void {
  if (districtAllowed(scope, bezirkId)) return;
  throw new TRPCError({
    code: "FORBIDDEN",
    message:
      "Du kannst Inhalte nur für deinen eigenen Bezirk anlegen und bearbeiten.",
  });
}

/**
 * Prüft nur den Wechsel: Formulare schicken den Bezirk bei jedem Speichern mit, eine
 * Wertprüfung sperrte Autoren von Alt-Inhalten und fremde Kurs-Organisatoren aus.
 */
export function assertDistrictChangeAllowed(
  scope: DistrictScope,
  submitted: string | null | undefined,
  stored: string | null,
): void {
  if (submitted === undefined || submitted === stored) return;
  assertDistrictAllowed(scope, submitted);
}

/**
 * Ein verlinktes Ensemble zeigt den Termin auf seiner öffentlichen Seite, daher eigene
 * Prüfung. Wie oben zählt nur der Wechsel; das Lösen einer Verknüpfung bleibt ungeprüft.
 */
export function ensembleLinkNeedsDistrictCheck(
  scope: DistrictScope,
  submitted: string | null | undefined,
  stored: string | null,
): submitted is string {
  if (scope.unrestricted) return false;
  if (submitted === undefined || submitted === stored) return false;
  return Boolean(submitted);
}

/** Listen-Filter: eigene Inhalte plus eigene Bezirke; `null` heißt „kein Filter nötig“. */
export function districtScopeFilter(
  scope: DistrictScope,
  userId: string,
): { OR: ({ createdById: string } | { bezirkId: { in: string[] } })[] } | null {
  if (scope.unrestricted) return null;
  return {
    OR: [{ createdById: userId }, { bezirkId: { in: scope.bezirkIds } }],
  };
}

/** Bezirksfeld im Formular: ein Bezirk gesperrt, mehrere als Auswahl, keiner als Hinweis. */
export type DistrictFieldState = {
  /** Gesperrt anzuzeigender Bezirk, wenn es nur einen zur Auswahl gibt. */
  lockedBezirkId: string | null;
  /** Keine Zuständigkeit: der Nutzer kann hier nichts anlegen. */
  hasNoDistrict: boolean;
  /** Erlaubte Auswahl; `null` heißt "alle Bezirke, auch übergreifend". */
  selectableBezirkIds: string[] | null;
};

export function districtFieldState(
  unrestricted: boolean,
  scopedBezirkIds: readonly string[],
): DistrictFieldState {
  if (unrestricted) {
    return {
      lockedBezirkId: null,
      hasNoDistrict: false,
      selectableBezirkIds: null,
    };
  }
  return {
    lockedBezirkId:
      scopedBezirkIds.length === 1 ? (scopedBezirkIds[0] ?? null) : null,
    hasNoDistrict: scopedBezirkIds.length === 0,
    selectableBezirkIds: [...scopedBezirkIds],
  };
}
