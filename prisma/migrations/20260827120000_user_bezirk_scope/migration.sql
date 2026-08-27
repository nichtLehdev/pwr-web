-- CreateTable
CREATE TABLE "UserBezirkScope" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bezirkId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBezirkScope_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserBezirkScope_userId_idx" ON "UserBezirkScope"("userId");

-- CreateIndex
CREATE INDEX "UserBezirkScope_bezirkId_idx" ON "UserBezirkScope"("bezirkId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBezirkScope_userId_bezirkId_key" ON "UserBezirkScope"("userId", "bezirkId");

-- AddForeignKey
ALTER TABLE "UserBezirkScope" ADD CONSTRAINT "UserBezirkScope_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBezirkScope" ADD CONSTRAINT "UserBezirkScope_bezirkId_fkey" FOREIGN KEY ("bezirkId") REFERENCES "Bezirk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Bestehende Bezirkszuordnung als Startwert übernehmen: wer bisher über
-- User.bezirkId zugeschnitten war, behält seinen Bezirk. Der Eintrag allein
-- erlaubt nichts, deshalb ist die Übernahme für alle unbedenklich.
INSERT INTO "UserBezirkScope" ("id", "userId", "bezirkId")
SELECT gen_random_uuid(), "id", "bezirkId"
FROM "user"
WHERE "bezirkId" IS NOT NULL
ON CONFLICT ("userId", "bezirkId") DO NOTHING;
