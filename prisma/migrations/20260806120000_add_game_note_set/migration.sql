-- CreateTable
CREATE TABLE "game_note_set" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "clef" TEXT NOT NULL,
    "pitches" JSONB NOT NULL,
    "creatorId" TEXT,
    "timesUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_note_set_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_note_set_publicId_key" ON "game_note_set"("publicId");

-- CreateIndex
CREATE INDEX "game_note_set_clef_idx" ON "game_note_set"("clef");

-- CreateIndex
CREATE INDEX "game_note_set_creatorId_idx" ON "game_note_set"("creatorId");

-- CreateIndex
CREATE INDEX "game_note_set_createdAt_idx" ON "game_note_set"("createdAt");

-- CreateIndex
CREATE INDEX "game_note_set_timesUsed_idx" ON "game_note_set"("timesUsed");

-- AddForeignKey
ALTER TABLE "game_note_set" ADD CONSTRAINT "game_note_set_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
