-- CreateTable
CREATE TABLE "game_result" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "maxScore" INTEGER,
    "streak" INTEGER,
    "durationMs" INTEGER,
    "meta" JSONB,
    "playedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_result_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_result_userId_game_idx" ON "game_result"("userId", "game");

-- CreateIndex
CREATE INDEX "game_result_game_score_idx" ON "game_result"("game", "score");

-- CreateIndex
CREATE UNIQUE INDEX "game_result_userId_clientId_key" ON "game_result"("userId", "clientId");

-- AddForeignKey
ALTER TABLE "game_result" ADD CONSTRAINT "game_result_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
