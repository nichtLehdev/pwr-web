-- AlterTable
ALTER TABLE "CourseRegistration" ADD COLUMN     "promotionOfferExpiresAt" TIMESTAMP(3),
ADD COLUMN     "promotionOfferPassedSeats" INTEGER,
ADD COLUMN     "promotionOfferReminderSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "CourseRegistration_promotionOfferExpiresAt_idx" ON "CourseRegistration"("promotionOfferExpiresAt");
