-- CreateEnum
CREATE TYPE "CoursePaymentMethod" AS ENUM ('CASH', 'INVOICE');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "paymentCashAllowed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "paymentInvoiceAllowed" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "CourseRegistration" ADD COLUMN     "paymentMethod" "CoursePaymentMethod";
