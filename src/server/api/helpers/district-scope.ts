import type { PrismaClient } from "~/generated/prisma/client";
import { districtScopeFor, type ContentResource } from "@/lib/district-scope";
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
