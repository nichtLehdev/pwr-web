-- Rot markierte Zeilen der Versicherungstabelle bekommen keine Rechnung.
-- AlterTable
ALTER TABLE "insurance_invoice" ADD COLUMN     "sheetMarkedRed" BOOLEAN NOT NULL DEFAULT false;
