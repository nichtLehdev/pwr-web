-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CustomFieldType" ADD VALUE 'DATE';
ALTER TYPE "CustomFieldType" ADD VALUE 'YEAR';
ALTER TYPE "CustomFieldType" ADD VALUE 'TIME';
ALTER TYPE "CustomFieldType" ADD VALUE 'MULTISELECT';
ALTER TYPE "CustomFieldType" ADD VALUE 'PHONE';
ALTER TYPE "CustomFieldType" ADD VALUE 'EMAIL';
