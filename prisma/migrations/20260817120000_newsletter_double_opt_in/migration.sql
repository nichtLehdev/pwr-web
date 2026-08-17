-- AlterTable
ALTER TABLE "NewsletterSubscriber" ADD COLUMN     "confirmedAt" TIMESTAMP(3);

-- Grandfather the existing list: everyone currently subscribed signed up
-- deliberately through the form, they were just never asked to confirm the
-- address. Treat their sign-up as the confirmation rather than mailing the
-- whole list a re-opt-in they mostly would not answer.
UPDATE "NewsletterSubscriber" SET "confirmedAt" = "subscribedAt" WHERE "isActive" = true;

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_isActive_confirmedAt_idx" ON "NewsletterSubscriber"("isActive", "confirmedAt");
