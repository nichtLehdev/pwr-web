import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "~/generated/prisma/client";
import {
  districtAllowed,
  districtScopeFor,
  ensembleLinkNeedsDistrictCheck,
  type ContentResource,
} from "@/lib/district-scope";
import type { DistrictScope } from "@/lib/district-scope";
import {
  resolveUserPermissionsCached,
  type PermissionCache,
} from "./permissions";

// Damit die Router nur einen Import brauchen; die Entscheidungslogik selbst
// steht db-frei in @/lib/district-scope und ist dort auch getestet.
export {
  assertDistrictAllowed,
  assertDistrictChangeAllowed,
  districtAllowed,
  districtScopeFilter,
  ensembleLinkNeedsDistrictCheck,
} from "@/lib/district-scope";
export type { ContentResource, DistrictScope } from "@/lib/district-scope";

/**
 * Die Bezirke kommen aus `UserBezirkScope`, nicht aus `User.bezirkId`.
 *
 * `User.bezirkId` ist die Organisationszugehörigkeit und steht öffentlich für
 * ein Amt; sie taugt nicht als Berechtigungsgrenze. Sonst müsste man jemanden
 * zum Obmann machen, nur damit er einmal einen Termin für einen Bezirk
 * einstellen darf.
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
 * Schlägt den Bezirk des Ensembles nach; die Regel selbst steht in
 * `ensembleLinkNeedsDistrictCheck`.
 */
export async function assertEnsembleDistrictChangeAllowed(
  db: PrismaClient,
  scope: DistrictScope,
  submitted: string | null | undefined,
  stored: string | null,
): Promise<void> {
  if (!ensembleLinkNeedsDistrictCheck(scope, submitted, stored)) return;

  const ensemble = await db.ensemble.findUnique({
    where: { id: submitted },
    select: { bezirkId: true },
  });

  if (!ensemble) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Ensemble nicht gefunden",
    });
  }

  if (!districtAllowed(scope, ensemble.bezirkId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Du kannst nur Ensembles aus deinem eigenen Bezirk verknüpfen. " +
        "Für Gäste von außerhalb gib bitte einen freien Namen ein.",
    });
  }
}
