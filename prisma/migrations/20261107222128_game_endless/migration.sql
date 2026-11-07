-- CreateTable
CREATE TABLE "game_endless_run" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "hearts" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReportAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_endless_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_endless_best" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "replay" JSONB,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_endless_best_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_endless_run_profileId_idx" ON "game_endless_run"("profileId");

-- CreateIndex
CREATE INDEX "game_endless_run_lastReportAt_idx" ON "game_endless_run"("lastReportAt");

-- CreateIndex
CREATE INDEX "game_endless_best_game_variant_score_idx" ON "game_endless_best"("game", "variant", "score");

-- CreateIndex
CREATE UNIQUE INDEX "game_endless_best_profileId_game_variant_key" ON "game_endless_best"("profileId", "game", "variant");

-- AddForeignKey
ALTER TABLE "game_endless_run" ADD CONSTRAINT "game_endless_run_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "game_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_endless_best" ADD CONSTRAINT "game_endless_best_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "game_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
