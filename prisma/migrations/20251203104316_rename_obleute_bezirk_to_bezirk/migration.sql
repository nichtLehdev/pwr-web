/*
  Warnings:

  - You are about to drop the column `obleuteBezirkId` on the `user` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "user" DROP CONSTRAINT "user_obleuteBezirkId_fkey";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "obleuteBezirkId",
ADD COLUMN     "bezirkId" TEXT;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_bezirkId_fkey" FOREIGN KEY ("bezirkId") REFERENCES "Bezirk"("id") ON DELETE SET NULL ON UPDATE CASCADE;
