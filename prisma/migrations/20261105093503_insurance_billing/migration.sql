-- Versicherungsabrechnung der Geschäftsstelle: Einstellungen, Prämien je Wertklasse, Läufe und Rechnungen.
-- CreateTable
CREATE TABLE "insurance_billing_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0.19,
    "paymentReferencePrefix" TEXT NOT NULL DEFAULT '0130',
    "introText" TEXT,
    "closingText" TEXT,
    "signatureName" TEXT,
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_billing_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_premium_rate" (
    "maxValue" INTEGER NOT NULL,
    "netPremium" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_premium_rate_pkey" PRIMARY KEY ("maxValue")
);

-- CreateTable
CREATE TABLE "insurance_billing_run" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sourceFilename" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL,
    "paymentReferencePrefix" TEXT NOT NULL,
    "rates" JSONB NOT NULL,
    "introText" TEXT NOT NULL,
    "closingText" TEXT NOT NULL,
    "signatureName" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insurance_billing_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_invoice" (
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
    "quantities" JSONB NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "sheetTotal" DOUBLE PRECISION,
    "sheetNote" TEXT,
    "excluded" BOOLEAN NOT NULL DEFAULT false,
    "mailedAt" TIMESTAMP(3),
    "mailedTo" TEXT,
    "mailError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "insurance_billing_run_year_idx" ON "insurance_billing_run"("year");

-- CreateIndex
CREATE INDEX "insurance_invoice_runId_sheetRow_idx" ON "insurance_invoice"("runId", "sheetRow");

-- AddForeignKey
ALTER TABLE "insurance_billing_run" ADD CONSTRAINT "insurance_billing_run_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_invoice" ADD CONSTRAINT "insurance_invoice_runId_fkey" FOREIGN KEY ("runId") REFERENCES "insurance_billing_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
