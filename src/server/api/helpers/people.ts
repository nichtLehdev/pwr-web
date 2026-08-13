import { TRPCError } from "@trpc/server";
import { maskUserContact } from "@/lib/mask-user-contact";
import { resolvePerson, type PersonUserLike } from "@/lib/resolve-person";
import type {
  Media,
  Prisma,
  PosaunenwartRoleType,
} from "~/generated/prisma/client";

/**
 * Nutzerfelder, die für die Anzeige einer Person gebraucht werden. `preferences`
 * steuert nur die Maskierung und wird nie mit ausgeliefert.
 */
export const personUserSelect = {
  id: true,
  displayName: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  street: true,
  zipCode: true,
  city: true,
  bio: true,
  districtRoleName: true,
  profileImage: true,
  preferences: true,
} as const;

export type PersonUser = PersonUserLike<Media>;

/** Öffentliche Sicht auf den verknüpften User — ohne preferences, maskiert. */
export function toPublicUser<U extends PersonUser>(user: U | null | undefined) {
  if (!user) return null;
  const masked = maskUserContact(user);
  const fullName = [user.firstName, user.lastName]
    .filter((part) => part && part.trim().length > 0)
    .join(" ")
    .trim();
  return {
    id: user.id ?? null,
    displayName: user.displayName ?? (fullName.length > 0 ? fullName : null),
    email: user.email ?? null,
    phone: masked.phone,
    city: masked.city,
    bio: user.bio ?? null,
    districtRoleName: user.districtRoleName ?? null,
    profileImage: user.profileImage ?? null,
  };
}

/**
 * Hängt an einen Personendatensatz die aufgelöste Anzeige (`person`) und
 * ersetzt den rohen User durch die öffentliche Sicht. Alle Personen-Endpunkte
 * gehen hier durch, damit Seiten nicht jedes Mal selbst zusammenbauen müssen,
 * was aus dem Datensatz und was aus dem Konto kommt.
 */
export function withPerson<
  R extends { user?: PersonUser | null; image?: Media | null },
>(record: R) {
  const { user, ...rest } = record;
  return {
    ...rest,
    user: toPublicUser(user),
    person: resolvePerson(record, user),
  };
}

export type SocialLink = { type: string; url: string; label?: string };

export function parseResponsibilities(value: string | undefined) {
  if (value === undefined) return undefined;
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function parseSocials(value: string | undefined) {
  if (value === undefined) return undefined;
  if (value.trim().length === 0) return [];
  try {
    return JSON.parse(value) as SocialLink[];
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Social-Media-Links konnten nicht gelesen werden.",
    });
  }
}

export const teamMemberInclude = {
  image: true,
  user: { select: personUserSelect },
} satisfies Prisma.TeamMemberInclude;

type TeamMemberRecord = Prisma.TeamMemberGetPayload<{
  include: typeof teamMemberInclude;
}>;

export function toTeamMember(member: TeamMemberRecord) {
  return {
    ...withPerson(member),
    responsibilities: (member.responsibilities as string[] | null) ?? [],
    socials: (member.socials as SocialLink[] | null) ?? [],
  };
}

export const posaunenwartInclude = {
  user: { select: personUserSelect },
  image: true,
  responsibilities: {
    include: { bezirk: true },
    orderBy: { bezirk: { number: "asc" } },
  },
} as const;

type PosaunenwartRecord = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  bio: string | null;
  roleLabel: string | null;
  roleType: PosaunenwartRoleType;
  sortOrder: number;
  userId: string | null;
  image: Media | null;
  user: PersonUser | null;
  responsibilities: {
    notes: string | null;
    priority: number;
    bezirk: {
      id: string;
      number: number;
      name: string;
      shortName: string;
    };
  }[];
};

export function toPosaunenwart<P extends PosaunenwartRecord>(pw: P) {
  const person = resolvePerson(pw, pw.user);
  return {
    id: pw.id,
    name: person.name,
    email: person.email ?? "",
    role: pw.roleType,
    phone: person.phone,
    bio: person.bio,
    // Badge-Text: eigener Text schlägt die Rolle am Benutzerkonto.
    districtRoleName: pw.roleLabel ?? person.districtRoleName,
    profileImage: person.image,
    userId: pw.userId,
    sortOrder: pw.sortOrder,
    person,
    bezirke: pw.responsibilities.map((r) => ({
      id: r.bezirk.id,
      number: r.bezirk.number,
      name: r.bezirk.name,
      shortName: r.bezirk.shortName,
      notes: r.notes,
      priority: r.priority,
    })),
  };
}

export const bezirkPersonInclude = {
  user: { select: personUserSelect },
  image: true,
} as const;

/** Ein Bezirksamt in Anzeigeform — Datensatzfelder schlagen die Nutzerdaten. */
export function toBezirkPerson<
  P extends {
    id: string;
    bezirkId: string;
    roleName: string;
    sortOrder: number;
    userId: string | null;
    image: Media | null;
    user: PersonUser | null;
  },
>(record: P) {
  const person = resolvePerson(record, record.user);
  return {
    id: record.id,
    bezirkId: record.bezirkId,
    roleName: record.roleName,
    sortOrder: record.sortOrder,
    userId: record.userId,
    name: person.name,
    email: person.email,
    phone: person.phone,
    street: person.street,
    zipCode: person.zipCode,
    city: person.city,
    address: person.address,
    bio: person.bio,
    image: person.image,
    person,
  };
}
