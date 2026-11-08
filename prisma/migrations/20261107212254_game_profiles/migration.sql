-- AlterTable
ALTER TABLE "game_result" ADD COLUMN     "profileId" TEXT;

-- CreateTable
CREATE TABLE "game_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nameAdjective" TEXT NOT NULL,
    "nameNoun" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "instruments" TEXT[],
    "progress" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_profile_userId_idx" ON "game_profile"("userId");

-- CreateIndex
CREATE INDEX "game_result_profileId_playedAt_idx" ON "game_result"("profileId", "playedAt");

-- AddForeignKey
ALTER TABLE "game_result" ADD CONSTRAINT "game_result_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "game_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_profile" ADD CONSTRAINT "game_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
