/*
  Warnings:

  - The values [BEZIRKSOBMANN,BEZIRKSOBFRAU] on the enum `PosaunenratRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `district` on the `PosaunenratMember` table. All the data in the column will be lost.

*/

-- Step 1: Migrate existing data - map BEZIRKSOBMANN/BEZIRKSOBFRAU to SACHVERSTAENDIGER so the enum alter can succeed
UPDATE "PosaunenratMember"
SET "role" = 'SACHVERSTAENDIGER'
WHERE "role" IN ('BEZIRKSOBMANN', 'BEZIRKSOBFRAU');

-- Step 2: AlterEnum
BEGIN;
CREATE TYPE "PosaunenratRole_new" AS ENUM ('VORSTAND', 'LANDESKIRCHENMUSIKDIREKTOR', 'SACHVERSTAENDIGER', 'SACHVERSTAENDIGE');
ALTER TABLE "PosaunenratMember" ALTER COLUMN "role" TYPE "PosaunenratRole_new" USING ("role"::text::"PosaunenratRole_new");
ALTER TYPE "PosaunenratRole" RENAME TO "PosaunenratRole_old";
ALTER TYPE "PosaunenratRole_new" RENAME TO "PosaunenratRole";
DROP TYPE "public"."PosaunenratRole_old";
COMMIT;

-- Step 3: Drop district column (only if it exists - avoids errors if migration was partially applied)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'PosaunenratMember' AND column_name = 'district'
  ) THEN
    ALTER TABLE "PosaunenratMember" DROP COLUMN "district";
  END IF;
END $$;
