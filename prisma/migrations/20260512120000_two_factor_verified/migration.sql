-- AlterTable: better-auth two-factor plugin expects this column (enrollment vs verified state).
ALTER TABLE "twoFactor" ADD COLUMN "verified" BOOLEAN DEFAULT true;
