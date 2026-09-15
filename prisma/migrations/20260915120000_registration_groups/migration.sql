-- AlterTable
ALTER TABLE "CourseRegistration" ADD COLUMN     "registrationGroupId" TEXT;

-- CreateIndex
CREATE INDEX "CourseRegistration_registrationGroupId_idx" ON "CourseRegistration"("registrationGroupId");
