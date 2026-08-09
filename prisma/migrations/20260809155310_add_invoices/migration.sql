-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "invoicingEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "courseId" TEXT NOT NULL,
    "registrationId" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "recipientCompany" TEXT,
    "recipientFirstName" TEXT,
    "recipientLastName" TEXT,
    "recipientStreet" TEXT,
    "recipientZipCode" TEXT,
    "recipientCity" TEXT,
    "recipientEmail" TEXT,
    "lineItems" JSONB NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "invoiceDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "introText" TEXT,
    "closingText" TEXT,
    "signatureName" TEXT,
    "internalNote" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "replacesInvoiceId" TEXT,
    "pdfPath" TEXT,
    "pdfFilename" TEXT,
    "publishedAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "mailedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "publishedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoice_invoiceNumber_key" ON "invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_replacesInvoiceId_key" ON "invoice"("replacesInvoiceId");

-- CreateIndex
CREATE INDEX "invoice_courseId_status_idx" ON "invoice"("courseId", "status");

-- CreateIndex
CREATE INDEX "invoice_registrationId_idx" ON "invoice"("registrationId");

-- CreateIndex
CREATE INDEX "invoice_status_publishedAt_idx" ON "invoice"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "invoice_createdById_idx" ON "invoice"("createdById");

-- CreateIndex
CREATE INDEX "invoice_createdAt_idx" ON "invoice"("createdAt");

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "CourseRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_replacesInvoiceId_fkey" FOREIGN KEY ("replacesInvoiceId") REFERENCES "invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
