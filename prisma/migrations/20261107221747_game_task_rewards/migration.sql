-- CreateTable
CREATE TABLE "game_task_reward" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "taskKey" TEXT NOT NULL,
    "xp" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_task_reward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_task_reward_profileId_weekStart_taskKey_key" ON "game_task_reward"("profileId", "weekStart", "taskKey");

-- AddForeignKey
ALTER TABLE "game_task_reward" ADD CONSTRAINT "game_task_reward_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "game_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
