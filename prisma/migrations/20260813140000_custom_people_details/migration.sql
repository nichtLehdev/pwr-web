-- DropForeignKey
ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_userId_fkey";

-- AlterTable
ALTER TABLE "FoerdervereinMember" ADD COLUMN     "city" TEXT;

-- AlterTable
ALTER TABLE "PosaunenratMember" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "Posaunenwart" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "roleLabel" TEXT;

-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "imageId" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "phone" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "BezirkPerson" (
    "id" TEXT NOT NULL,
    "bezirkId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "street" TEXT,
    "zipCode" TEXT,
    "city" TEXT,
    "bio" TEXT,
    "imageId" TEXT,
    "roleName" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BezirkPerson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BezirkPerson_bezirkId_idx" ON "BezirkPerson"("bezirkId");

-- CreateIndex
CREATE INDEX "BezirkPerson_userId_idx" ON "BezirkPerson"("userId");

-- CreateIndex
CREATE INDEX "BezirkPerson_sortOrder_idx" ON "BezirkPerson"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "BezirkPerson_bezirkId_userId_key" ON "BezirkPerson"("bezirkId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_imageId_key" ON "TeamMember"("imageId");

-- AddForeignKey
ALTER TABLE "BezirkPerson" ADD CONSTRAINT "BezirkPerson_bezirkId_fkey" FOREIGN KEY ("bezirkId") REFERENCES "Bezirk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BezirkPerson" ADD CONSTRAINT "BezirkPerson_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BezirkPerson" ADD CONSTRAINT "BezirkPerson_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill: existing Obleute live on the user rows (user.bezirkId +
-- user.districtRoleName). Turn each into a BezirkPerson so the public pages
-- have one source of truth that also accepts people without an account.
INSERT INTO "BezirkPerson" ("id", "bezirkId", "userId", "roleName", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid(), u."bezirkId", u."id", u."districtRoleName", 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "user" u
WHERE u."bezirkId" IS NOT NULL
  AND u."districtRoleName" IS NOT NULL
ON CONFLICT ("bezirkId", "userId") DO NOTHING;
