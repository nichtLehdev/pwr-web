-- CreateTable
CREATE TABLE "SavedParticipant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "city" TEXT NOT NULL,
    "instrument" TEXT,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedParticipant_userId_idx" ON "SavedParticipant"("userId");

-- AddForeignKey
ALTER TABLE "SavedParticipant" ADD CONSTRAINT "SavedParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
