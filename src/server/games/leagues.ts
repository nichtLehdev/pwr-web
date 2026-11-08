import { randomUUID } from "node:crypto";
import type { PrismaClient } from "~/generated/prisma/client";
import { profileName } from "@/app/spiele/_lib/profiles/names";
import {
  MIN_GROUP_FOR_MOVEMENT,
  movementFor,
  pickGroup,
  TIERS,
  weekEndOf,
  weekStartOf,
} from "@/app/spiele/_lib/leagues";

type Db = Pick<
  PrismaClient,
  | "gameLeagueMember"
  | "gameResult"
  | "gameProfile"
  | "gameTaskReward"
  | "$transaction"
>;

async function weeklyXp(
  db: Db,
  profileIds: string[],
  weekStart: Date,
): Promise<Map<string, number>> {
  if (profileIds.length === 0) return new Map();
  const rows = await db.gameResult.groupBy({
    by: ["profileId"],
    where: {
      profileId: { in: profileIds },
      createdAt: { gte: weekStart, lt: weekEndOf(weekStart) },
    },
    _sum: { xp: true },
  });
  const xp = new Map(rows.map((r) => [r.profileId!, r._sum.xp ?? 0]));
  // Boni der Wochenaufgaben zählen mit.
  const rewards = await db.gameTaskReward.groupBy({
    by: ["profileId"],
    where: { profileId: { in: profileIds }, weekStart },
    _sum: { xp: true },
  });
  for (const r of rewards) {
    xp.set(r.profileId, (xp.get(r.profileId) ?? 0) + (r._sum.xp ?? 0));
  }
  return xp;
}

type Ranked = {
  id: string;
  profileId: string;
  createdAt: Date;
  xp: number;
};

/** Mehr XP zuerst; bei Gleichstand, wer früher eingestiegen ist. */
function rank<T extends Ranked>(members: T[]): T[] {
  return [...members].sort(
    (a, b) => b.xp - a.xp || a.createdAt.getTime() - b.createdAt.getTime(),
  );
}

/** Eine abgelaufene Woche abschließen: Auf- und Abstieg setzen, einmal je Gruppe. */
async function settleGroup(db: Db, weekStart: Date, groupId: string) {
  const members = await db.gameLeagueMember.findMany({
    where: { weekStart, groupId, outcome: null },
    select: {
      id: true,
      profileId: true,
      createdAt: true,
      tier: true,
      hidden: true,
    },
  });
  if (members.length === 0) return;
  const xp = await weeklyXp(
    db,
    members.map((m) => m.profileId),
    weekStart,
  );
  const visible = rank(
    members
      .filter((m) => !m.hidden)
      .map((m) => ({ ...m, xp: xp.get(m.profileId) ?? 0 })),
  );
  await db.$transaction([
    ...visible.map((m, index) => {
      const move = movementFor(index, visible.length, m.tier);
      return db.gameLeagueMember.update({
        where: { id: m.id },
        data: { outcome: move },
      });
    }),
    ...visible.map((m, index) =>
      db.gameProfile.update({
        where: { id: m.profileId },
        data: {
          tier: Math.min(
            TIERS.length - 1,
            Math.max(0, m.tier + movementFor(index, visible.length, m.tier)),
          ),
        },
      }),
    ),
    ...members
      .filter((m) => m.hidden)
      .map((m) =>
        db.gameLeagueMember.update({
          where: { id: m.id },
          data: { outcome: 0 },
        }),
      ),
  ]);
}

async function settlePrevious(db: Db, profileId: string, weekStart: Date) {
  const open = await db.gameLeagueMember.findMany({
    where: { profileId, outcome: null, weekStart: { lt: weekStart } },
    select: { weekStart: true, groupId: true },
  });
  for (const week of open) await settleGroup(db, week.weekStart, week.groupId);
}

/** Mit der ersten XP der Woche kommt ein Profil in eine Gruppe. */
export async function ensureLeagueMembership(
  db: Db,
  profileId: string,
  now = new Date(),
): Promise<void> {
  const weekStart = weekStartOf(now);
  await settlePrevious(db, profileId, weekStart);
  const existing = await db.gameLeagueMember.findUnique({
    where: { profileId_weekStart: { profileId, weekStart } },
    select: { id: true },
  });
  if (existing) return;
  const profile = await db.gameProfile.findUnique({
    where: { id: profileId },
    select: { tier: true },
  });
  if (!profile) return;
  const groups = await db.gameLeagueMember.groupBy({
    by: ["groupId", "tier"],
    where: { weekStart },
    _count: { _all: true },
  });
  const slots = new Map<
    string,
    { groupId: string; tier: number; members: number }
  >();
  for (const g of groups) {
    const slot = slots.get(g.groupId);
    if (slot) slot.members += g._count._all;
    else
      slots.set(g.groupId, {
        groupId: g.groupId,
        tier: g.tier,
        members: g._count._all,
      });
  }
  const groupId = pickGroup([...slots.values()], profile.tier) ?? randomUUID();
  await db.gameLeagueMember.createMany({
    data: [{ profileId, weekStart, groupId, tier: profile.tier }],
    skipDuplicates: true,
  });
}

export type LeagueStanding = {
  weekStart: string;
  weekEnd: string;
  tier: number;
  joined: boolean;
  /** Ergebnis der Vorwoche, falls es eine gab. */
  lastOutcome: number | null;
  movement: boolean;
  members: {
    key: string;
    name: string;
    color: string;
    xp: number;
    isMe: boolean;
    move: -1 | 0 | 1;
  }[];
};

export async function leagueStanding(
  db: Db,
  profileId: string,
  now = new Date(),
): Promise<LeagueStanding> {
  const weekStart = weekStartOf(now);
  await settlePrevious(db, profileId, weekStart);
  const [me, profile, last] = await Promise.all([
    db.gameLeagueMember.findUnique({
      where: { profileId_weekStart: { profileId, weekStart } },
      select: { groupId: true, tier: true },
    }),
    db.gameProfile.findUnique({
      where: { id: profileId },
      select: { tier: true },
    }),
    db.gameLeagueMember.findFirst({
      where: { profileId, weekStart: { lt: weekStart } },
      orderBy: { weekStart: "desc" },
      select: { outcome: true },
    }),
  ]);
  const base = {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEndOf(weekStart).toISOString(),
    tier: me?.tier ?? profile?.tier ?? 0,
    lastOutcome: last?.outcome ?? null,
  };
  if (!me) return { ...base, joined: false, movement: false, members: [] };

  const members = await db.gameLeagueMember.findMany({
    where: { weekStart, groupId: me.groupId, hidden: false },
    select: {
      id: true,
      profileId: true,
      createdAt: true,
      tier: true,
      profile: { select: { nameAdjective: true, nameNoun: true, color: true } },
    },
  });
  const xp = await weeklyXp(
    db,
    members.map((m) => m.profileId),
    weekStart,
  );
  const ranked = rank(
    members.map((m) => ({ ...m, xp: xp.get(m.profileId) ?? 0 })),
  );
  return {
    ...base,
    joined: true,
    movement: ranked.length >= MIN_GROUP_FOR_MOVEMENT,
    members: ranked.map((m, index) => ({
      key: m.id,
      name: profileName(m.profile.nameAdjective, m.profile.nameNoun),
      color: m.profile.color,
      xp: m.xp,
      isMe: m.profileId === profileId,
      move: movementFor(index, ranked.length, m.tier),
    })),
  };
}
