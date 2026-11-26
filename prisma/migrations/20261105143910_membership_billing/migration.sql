-- CreateEnum
CREATE TYPE "MembershipBillingRunStatus" AS ENUM ('DRAFT', 'ISSUED');

-- CreateTable
CREATE TABLE "membership_billing_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "paymentReferencePrefix" TEXT NOT NULL DEFAULT '1174',
    "baseFee" DOUBLE PRECISION,
    "rateWithIncome" DOUBLE PRECISION,
    "rateWithoutIncome" DOUBLE PRECISION,
    "magazinePrice" DOUBLE PRECISION,
    "introText" TEXT,
    "closingText" TEXT,
    "signatureName" TEXT,
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_billing_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_billing_run" (
    "id" TEXT NOT NULL,
    "status" "MembershipBillingRunStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3),
    "year" INTEGER NOT NULL,
    "sourceFilename" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "sheetRates" JSONB NOT NULL,
    "paymentReferencePrefix" TEXT,
    "rates" JSONB,
    "introText" TEXT,
    "closingText" TEXT,
    "signatureName" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_billing_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_invoice" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "sheetRow" INTEGER NOT NULL,
    "choirNumber" TEXT NOT NULL,
    "choirName" TEXT,
    "recipientName1" TEXT,
    "recipientName2" TEXT,
    "recipientStreet" TEXT,
    "recipientCity" TEXT,
    "email" TEXT,
    "membersWithIncome" INTEGER,
    "membersWithoutIncome" INTEGER,
    "graduatedFeeFixed" DOUBLE PRECISION,
    "magazineCount" INTEGER NOT NULL DEFAULT 0,
    "arrears" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "sheetTotal" DOUBLE PRECISION,
    "sheetTotalFixed" BOOLEAN NOT NULL DEFAULT false,
    "sheetHasTotal" BOOLEAN NOT NULL DEFAULT true,
    "sheetNote" TEXT,
    "sheetMarkedRed" BOOLEAN NOT NULL DEFAULT false,
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "excluded" BOOLEAN NOT NULL DEFAULT false,
    "mailedAt" TIMESTAMP(3),
    "mailedTo" TEXT,
    "mailError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "membership_billing_run_status_year_idx" ON "membership_billing_run"("status", "year");

-- CreateIndex
CREATE INDEX "membership_invoice_runId_sheetRow_idx" ON "membership_invoice"("runId", "sheetRow");

-- AddForeignKey
ALTER TABLE "membership_billing_run" ADD CONSTRAINT "membership_billing_run_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_invoice" ADD CONSTRAINT "membership_invoice_runId_fkey" FOREIGN KEY ("runId") REFERENCES "membership_billing_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
