/*
  Warnings:

  - You are about to drop the column `displayRole` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `obleuteRole` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `roleType` on the `user` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "user_role_idx";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "displayRole",
DROP COLUMN "obleuteRole",
DROP COLUMN "role",
DROP COLUMN "roleType",
ADD COLUMN     "districtRoleName" TEXT;

-- DropEnum
DROP TYPE "UserRole";

-- CreateIndex
CREATE INDEX "user_bezirkId_idx" ON "user"("bezirkId");
