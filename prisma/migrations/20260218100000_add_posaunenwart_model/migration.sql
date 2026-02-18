-- CreateTable: Posaunenwart (like VorstandMember, links to User)
CREATE TABLE "Posaunenwart" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "roleType" "PosaunenwartRoleType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "imageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Posaunenwart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Posaunenwart_userId_key" ON "Posaunenwart"("userId");
CREATE UNIQUE INDEX "Posaunenwart_imageId_key" ON "Posaunenwart"("imageId");
CREATE INDEX "Posaunenwart_roleType_idx" ON "Posaunenwart"("roleType");
CREATE INDEX "Posaunenwart_sortOrder_idx" ON "Posaunenwart"("sortOrder");

-- AddForeignKey Posaunenwart -> user
ALTER TABLE "Posaunenwart" ADD CONSTRAINT "Posaunenwart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey Posaunenwart -> Media (image)
ALTER TABLE "Posaunenwart" ADD CONSTRAINT "Posaunenwart_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrate data: create one Posaunenwart per user that has responsibilities
INSERT INTO "Posaunenwart" ("id", "userId", "roleType", "sortOrder", "createdAt", "updatedAt")
SELECT
    gen_random_uuid(),
    r."userId",
    CASE WHEN bool_or(r."roleType" = 'LPW') THEN 'LPW'::"PosaunenwartRoleType" ELSE 'RPW'::"PosaunenwartRoleType" END,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "PosaunenwartResponsibility" r
GROUP BY r."userId";

-- Add posaunenwartId to PosaunenwartResponsibility (nullable first)
ALTER TABLE "PosaunenwartResponsibility" ADD COLUMN "posaunenwartId" TEXT;

-- Backfill posaunenwartId from Posaunenwart where userId matches
UPDATE "PosaunenwartResponsibility" pr
SET "posaunenwartId" = p."id"
FROM "Posaunenwart" p
WHERE p."userId" = pr."userId";

-- Drop old constraint and columns from PosaunenwartResponsibility
ALTER TABLE "PosaunenwartResponsibility" DROP CONSTRAINT IF EXISTS "PosaunenwartResponsibility_userId_fkey";
DROP INDEX IF EXISTS "PosaunenwartResponsibility_userId_bezirkId_key";
ALTER TABLE "PosaunenwartResponsibility" DROP COLUMN "roleType";
ALTER TABLE "PosaunenwartResponsibility" DROP COLUMN "userId";

-- Make posaunenwartId required
ALTER TABLE "PosaunenwartResponsibility" ALTER COLUMN "posaunenwartId" SET NOT NULL;

-- Add unique and FK
CREATE UNIQUE INDEX "PosaunenwartResponsibility_posaunenwartId_bezirkId_key" ON "PosaunenwartResponsibility"("posaunenwartId", "bezirkId");
CREATE INDEX "PosaunenwartResponsibility_posaunenwartId_idx" ON "PosaunenwartResponsibility"("posaunenwartId");

ALTER TABLE "PosaunenwartResponsibility" ADD CONSTRAINT "PosaunenwartResponsibility_posaunenwartId_fkey" FOREIGN KEY ("posaunenwartId") REFERENCES "Posaunenwart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old index on roleType (column already dropped)
DROP INDEX IF EXISTS "PosaunenwartResponsibility_roleType_idx";
-- Drop old userId index
DROP INDEX IF EXISTS "PosaunenwartResponsibility_userId_idx";
