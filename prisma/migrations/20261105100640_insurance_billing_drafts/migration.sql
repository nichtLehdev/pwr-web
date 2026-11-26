-- Versicherungsabrechnung: Entwurf und Ausstellen wie bei den Kursrechnungen.
-- Entwürfe rechnen mit den aktuellen Einstellungen; eingefroren wird erst beim Ausstellen.

-- CreateEnum
CREATE TYPE "InsuranceBillingRunStatus" AS ENUM ('DRAFT', 'ISSUED');

-- DropIndex
DROP INDEX "insurance_billing_run_year_idx";

-- AlterTable
ALTER TABLE "insurance_billing_run" ADD COLUMN     "issuedAt" TIMESTAMP(3),
ADD COLUMN     "sheetRates" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "sheetTaxRate" DOUBLE PRECISION,
ADD COLUMN     "status" "InsuranceBillingRunStatus" NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "taxRate" DROP NOT NULL,
ALTER COLUMN "paymentReferencePrefix" DROP NOT NULL,
ALTER COLUMN "rates" DROP NOT NULL,
ALTER COLUMN "introText" DROP NOT NULL,
ALTER COLUMN "closingText" DROP NOT NULL;

-- Läufe von vorher waren beim Anlegen schon eingefroren: sie gelten als ausgestellt.
UPDATE "insurance_billing_run"
SET "status" = 'ISSUED',
    "issuedAt" = "createdAt",
    "sheetRates" = COALESCE("rates", '[]'::jsonb);

ALTER TABLE "insurance_billing_run" ALTER COLUMN "sheetRates" DROP DEFAULT;

-- AlterTable
ALTER TABLE "insurance_invoice" ADD COLUMN     "warnings" JSONB NOT NULL DEFAULT '[]';

-- CreateIndex
CREATE INDEX "insurance_billing_run_status_year_idx" ON "insurance_billing_run"("status", "year");
