import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "~/generated/prisma/client";
import {
  districtAllowed,
  districtScopeFor,
  ensembleLinksNeedingDistrictCheck,
  type ContentResource,
} from "@/lib/district-scope";
import type { DistrictScope } from "@/lib/district-scope";
import {
  resolveUserPermissionsCached,
  type PermissionCache,
} from "./permissions";

// Die db-freie Entscheidungslogik steht (samt Tests) in @/lib/district-scope.
export {
  assertDistrictAllowed,
  assertDistrictChangeAllowed,
  districtAllowed,
  districtScopeFilter,
  ensembleLinksNeedingDistrictCheck,
} from "@/lib/district-scope";
export type { ContentResource, DistrictScope } from "@/lib/district-scope";

/**
 * Die Bezirke kommen aus `UserBezirkScope`, nicht aus `User.bezirkId`: das ist die
 * öffentliche Organisationszugehörigkeit (ein Amt) und keine Berechtigungsgrenze.
 */
export async function resolveDistrictScope(
  db: PrismaClient,
  userId: string,
  resource: ContentResource,
  permissionCache?: PermissionCache,
): Promise<DistrictScope> {
  const [perms, scopes] = await Promise.all([
    resolveUserPermissionsCached(userId, permissionCache),
    db.userBezirkScope.findMany({
      where: { userId },
      select: { bezirkId: true },
    }),
  ]);

  return districtScopeFor(
    perms,
    resource,
    scopes.map((s) => s.bezirkId),
  );
}

/**
 * Schlägt die Bezirke neu verknüpfter Ensembles nach; die Regel selbst steht in
 * `ensembleLinksNeedingDistrictCheck`.
 */
export async function assertEnsembleLinksAllowed(
  db: PrismaClient,
  scope: DistrictScope,
  submitted: readonly string[] | undefined,
  stored: readonly string[],
): Promise<void> {
  const toCheck = ensembleLinksNeedingDistrictCheck(scope, submitted, stored);
  if (toCheck.length === 0) return;

  const ensembles = await db.ensemble.findMany({
    where: { id: { in: toCheck } },
    select: { id: true, name: true, bezirkId: true },
  });

  if (ensembles.length !== toCheck.length) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Ensemble nicht gefunden",
    });
  }

  const outside = ensembles.filter((e) => !districtAllowed(scope, e.bezirkId));
  if (outside.length > 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        `Du kannst nur Ensembles aus deinem eigenen Bezirk verknüpfen (${outside
          .map((e) => e.name)
          .join(", ")}). ` +
        "Für Gäste von außerhalb gib bitte einen freien Namen ein.",
    });
  }
}
