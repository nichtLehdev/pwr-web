-- CreateEnum
CREATE TYPE "SiblingDiscountStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "allowSiblingDiscount" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CourseRegistration" ADD COLUMN     "originalTotalPrice" DOUBLE PRECISION,
ADD COLUMN     "siblingDiscountAmount" DOUBLE PRECISION,
ADD COLUMN     "siblingDiscountApplied" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "siblingDiscountStatus" "SiblingDiscountStatus" NOT NULL DEFAULT 'NONE';

-- CreateIndex
CREATE INDEX "CourseRegistration_siblingDiscountStatus_idx" ON "CourseRegistration"("siblingDiscountStatus");
