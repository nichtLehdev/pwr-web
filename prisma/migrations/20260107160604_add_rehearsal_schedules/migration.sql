-- CreateTable
CREATE TABLE "RehearsalSchedule" (
    "id" TEXT NOT NULL,
    "ensembleId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RehearsalSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RehearsalSchedule_ensembleId_idx" ON "RehearsalSchedule"("ensembleId");

-- AddForeignKey
ALTER TABLE "RehearsalSchedule" ADD CONSTRAINT "RehearsalSchedule_ensembleId_fkey" FOREIGN KEY ("ensembleId") REFERENCES "Ensemble"("id") ON DELETE CASCADE ON UPDATE CASCADE;
