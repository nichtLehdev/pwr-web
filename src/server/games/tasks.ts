import type { PrismaClient } from "~/generated/prisma/client";
import { berlinParts } from "@/lib/berlin-time";
import { weekEndOf, weekStartOf } from "@/app/spiele/_lib/leagues";
import {
  TASK_REWARD_XP,
  weeklyTasks,
  type TaskResult,
} from "@/app/spiele/_lib/weekly-tasks";

type Db = Pick<PrismaClient, "gameResult" | "gameProfile" | "gameTaskReward">;

function berlinDay(date: Date): string {
  const { year, month, day } = berlinParts(date);
  return `${year}-${month}-${day}`;
}

export type TaskStatus = {
  key: string;
  title: string;
  progress: number;
  target: number;
  done: boolean;
  reward: number;
};

/** Fortschritt der Wochenaufgaben; geschaffte bekommen einmal ihren Bonus. */
export async function evaluateTasks(
  db: Db,
  profileId: string,
  now = new Date(),
): Promise<TaskStatus[]> {
  const profile = await db.gameProfile.findUnique({
    where: { id: profileId },
    select: { instruments: true },
  });
  if (!profile) return [];
  const weekStart = weekStartOf(now);
  const rows = await db.gameResult.findMany({
    where: {
      profileId,
      createdAt: { gte: weekStart, lt: weekEndOf(weekStart) },
    },
    select: {
      game: true,
      score: true,
      maxScore: true,
      xp: true,
      createdAt: true,
      meta: true,
    },
  });
  const results = rows as TaskResult[];
  const tasks = weeklyTasks(profileId, weekStart, profile.instruments).map(
    (task) => {
      const progress = Math.min(task.target, task.measure(results, berlinDay));
      return {
        key: task.key,
        title: task.title,
        progress,
        target: task.target,
        done: progress >= task.target,
        reward: TASK_REWARD_XP,
      };
    },
  );
  const done = tasks.filter((t) => t.done);
  if (done.length > 0) {
    await db.gameTaskReward.createMany({
      data: done.map((t) => ({
        profileId,
        weekStart,
        taskKey: t.key,
        xp: TASK_REWARD_XP,
      })),
      skipDuplicates: true,
    });
  }
  return tasks;
}
