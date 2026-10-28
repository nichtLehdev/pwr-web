type Named = { id?: string; name?: string | null } | null | undefined;

type ProfileLike = {
  id?: string;
  displayName?: string | null;
  districtRoleName?: string | null;
  bezirk?: Named;
  bezirkScopes?: { bezirk?: Named }[] | null;
  teamMember?: { role?: string | null } | null;
  vorstandMember?: { position?: string | null } | null;
  posaunenratMember?: { role?: string | null } | null;
  foerdervereinMember?: {
    position?: string | null;
    role?: string | null;
  } | null;
  posaunenwart?: {
    roleLabel?: string | null;
    roleType?: string | null;
    responsibilities?: { bezirk?: Named }[] | null;
  } | null;
};

function bezirkRef(bezirk: Named) {
  return bezirk?.id ? { id: bezirk.id, name: bezirk.name ?? null } : null;
}

/**
 * Was ein KI-Client über die angemeldete Person wissen muss: wie sie heißt
 * und in welchen Ämtern und Bezirken sie handelt. Kontakt-, Anschrift- und
 * Kontodaten aus `users.getMyProfile` bleiben draußen.
 */
export function summarizeProfile(result: unknown): unknown {
  if (typeof result !== "object" || result === null) return result;
  const profile = result as ProfileLike;

  const roles = [
    profile.districtRoleName,
    profile.teamMember?.role,
    profile.vorstandMember?.position,
    profile.posaunenratMember?.role &&
      `Posaunenrat (${profile.posaunenratMember.role})`,
    profile.foerdervereinMember &&
      `Förderverein (${profile.foerdervereinMember.position ?? profile.foerdervereinMember.role})`,
    profile.posaunenwart &&
      (profile.posaunenwart.roleLabel ?? profile.posaunenwart.roleType),
  ].filter((role): role is string => typeof role === "string" && role !== "");

  return {
    id: profile.id,
    displayName: profile.displayName ?? null,
    bezirk: bezirkRef(profile.bezirk),
    /** Zusätzliche Bezirke, für die die Person schreiben darf. */
    bezirkScopes: (profile.bezirkScopes ?? [])
      .map((scope) => bezirkRef(scope.bezirk))
      .filter(Boolean),
    /** Bezirke, für die die Person als Posaunenwart zuständig ist. */
    posaunenwartBezirke: (profile.posaunenwart?.responsibilities ?? [])
      .map((responsibility) => bezirkRef(responsibility.bezirk))
      .filter(Boolean),
    roles,
  };
}
