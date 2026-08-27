import { TRPCError } from "@trpc/server";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions";

/**
 * Bezirks-Zuschnitt für redaktionelle Inhalte.
 *
 * Obleute pflegen Termine, Beiträge und Kurse für ihren eigenen Bezirk; wer
 * freigeben darf (Admin, LPW, RPW), arbeitet bezirksübergreifend. Der Zuschnitt
 * hängt damit an der Freigabe-Berechtigung, nicht an einem Rollennamen — eine
 * eigens angelegte Rolle mit `*.approve` ist automatisch unbeschränkt, und das
 * Frontend rechnet mit derselben Regel (`isHigherRole = hasApprovePermission`).
 *
 * Reine Entscheidungslogik: das Laden von Berechtigungen und Bezirk steht in
 * `server/api/helpers/district-scope.ts`.
 */
export type ContentResource = "events" | "posts" | "courses";

export type DistrictScope =
  { unrestricted: true } | { unrestricted: false; bezirkIds: string[] };

const APPROVE_PERMISSION: Record<ContentResource, PermissionKey> = {
  events: PERMISSIONS.EVENTS_APPROVE,
  posts: PERMISSIONS.POSTS_APPROVE,
  courses: PERMISSIONS.COURSES_APPROVE,
};

/**
 * Die Bezirke stehen in `UserBezirkScope` und sind bewusst eine Liste: dieselbe
 * Person kann für mehrere Bezirke zuständig sein, und eine Ausnahme für einen
 * einzelnen Bezirk ist ein Eintrag, keine Amtsübertragung.
 */
export function districtScopeFor(
  perms: Set<PermissionKey>,
  resource: ContentResource,
  scopedBezirkIds: readonly string[],
): DistrictScope {
  if (perms.has(APPROVE_PERMISSION[resource])) return { unrestricted: true };
  return { unrestricted: false, bezirkIds: [...scopedBezirkIds] };
}

/**
 * Darf der Nutzer einen Inhalt diesem Bezirk zuordnen?
 *
 * `null` steht im Formular für "Übergreifend / Kein Bezirk" und bleibt der
 * Redaktion vorbehalten: ohne Bezirk taucht der Inhalt unter jedem Bezirksfilter
 * auf, ist also gerade keine Bezirksmeldung mehr.
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
 * Beim Bearbeiten zählt der Wechsel, nicht die Erwähnung.
 *
 * Die Dashboard-Formulare schicken bei jedem Speichern ihren kompletten Stand
 * mit, der Bezirk also auch dann, wenn niemand ihn angefasst hat. Gegen den
 * Wert zu prüfen würde deshalb nicht das Verschieben verhindern, sondern jedes
 * Speichern — und zwar genau bei denen, die auf anderem Weg Zugriff haben:
 * dem Autor eines Alt-Inhalts und dem delegierten Kurs-Organisator aus einem
 * fremden Bezirk. Dieselbe Falle wie bei `changesRestrictedFlag`.
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
 * Listen-Filter: eigene Inhalte plus alles aus den eigenen Bezirken.
 *
 * `null` heißt "kein Filter nötig" — der Aufrufer lässt seine `where`-Klausel
 * dann unangetastet, statt sie mit einer Immer-wahr-Bedingung aufzublähen.
 */
export function districtScopeFilter(
  scope: DistrictScope,
  userId: string,
): { OR: ({ createdById: string } | { bezirkId: { in: string[] } })[] } | null {
  if (scope.unrestricted) return null;
  return {
    OR: [{ createdById: userId }, { bezirkId: { in: scope.bezirkIds } }],
  };
}

/**
 * Wie das Bezirksfeld im Dashboard-Formular auftreten soll.
 *
 * Drei Fälle, damit die Formulare nicht jedes für sich raten: genau eine
 * Zuständigkeit wird gesperrt angezeigt (der Nutzer hat nichts zu wählen),
 * mehrere ergeben ein auf sie beschränktes Auswahlfeld, gar keine einen
 * Hinweis — dann lehnt auch der Server ab.
 */
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
