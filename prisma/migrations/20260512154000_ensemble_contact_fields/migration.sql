-- Migration: replace Ensemble.contactEmail/contactPhone with per-person
-- conductorEmail/Phone + representativeEmail/Phone, and add internalId.
--
-- Data preservation strategy: existing contactEmail/contactPhone are
-- assumed to represent the conductor's contact info in practice, so we
-- copy them into conductorEmail/conductorPhone before dropping.

ALTER TABLE "Ensemble" ADD COLUMN "internalId" TEXT;
ALTER TABLE "Ensemble" ADD COLUMN "conductorEmail" TEXT;
ALTER TABLE "Ensemble" ADD COLUMN "conductorPhone" TEXT;
ALTER TABLE "Ensemble" ADD COLUMN "representativeEmail" TEXT;
ALTER TABLE "Ensemble" ADD COLUMN "representativePhone" TEXT;

UPDATE "Ensemble"
SET "conductorEmail" = "contactEmail"
WHERE "contactEmail" IS NOT NULL AND "conductorEmail" IS NULL;

UPDATE "Ensemble"
SET "conductorPhone" = "contactPhone"
WHERE "contactPhone" IS NOT NULL AND "conductorPhone" IS NULL;

ALTER TABLE "Ensemble" DROP COLUMN "contactEmail";
ALTER TABLE "Ensemble" DROP COLUMN "contactPhone";

CREATE UNIQUE INDEX "Ensemble_internalId_key" ON "Ensemble"("internalId");
