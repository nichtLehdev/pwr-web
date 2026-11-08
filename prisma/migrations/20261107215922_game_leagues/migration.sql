-- AlterTable
ALTER TABLE "game_profile" ADD COLUMN     "tier" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "game_league_member" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "groupId" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "outcome" INTEGER,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_league_member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_league_member_weekStart_groupId_idx" ON "game_league_member"("weekStart", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "game_league_member_profileId_weekStart_key" ON "game_league_member"("profileId", "weekStart");

-- AddForeignKey
ALTER TABLE "game_league_member" ADD CONSTRAINT "game_league_member_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "game_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
