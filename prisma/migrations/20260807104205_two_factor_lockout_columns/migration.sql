-- better-auth >= 1.6.25 two-factor lockout columns. The plugin writes these
-- on every sign-in verification; without them Prisma rejects the update and
-- every TOTP (even valid ones) surfaces as "invalid code".
ALTER TABLE "twoFactor" ADD COLUMN "failedVerificationCount" INTEGER DEFAULT 0;
ALTER TABLE "twoFactor" ADD COLUMN "lockedUntil" TIMESTAMP(3);
