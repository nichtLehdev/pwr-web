-- CreateEnum
CREATE TYPE "DownPaymentMode" AS ENUM ('NONE', 'COURSE', 'TICKET');

-- CreateEnum
CREATE TYPE "DownPaymentRefundPolicy" AS ENUM ('NON_REFUNDABLE', 'REFUNDABLE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DownPaymentStatus" AS ENUM ('OPEN', 'PAID', 'REFUNDED', 'RETAINED');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "downPaymentAmount" DOUBLE PRECISION,
ADD COLUMN     "downPaymentMode" "DownPaymentMode" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "downPaymentRefundPolicy" "DownPaymentRefundPolicy" NOT NULL DEFAULT 'NON_REFUNDABLE',
ADD COLUMN     "downPaymentRefundText" TEXT;

-- AlterTable
ALTER TABLE "CoursePriceOption" ADD COLUMN     "downPaymentAmount" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "CourseRegistration" ADD COLUMN     "downPaymentAmount" DOUBLE PRECISION,
ADD COLUMN     "downPaymentNote" TEXT,
ADD COLUMN     "downPaymentPaidAmount" DOUBLE PRECISION,
ADD COLUMN     "downPaymentPaidAt" TIMESTAMP(3),
ADD COLUMN     "downPaymentPaidById" TEXT,
ADD COLUMN     "downPaymentStatus" "DownPaymentStatus";

-- AddForeignKey
ALTER TABLE "CourseRegistration" ADD CONSTRAINT "CourseRegistration_downPaymentPaidById_fkey" FOREIGN KEY ("downPaymentPaidById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
