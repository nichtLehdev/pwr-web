-- Einmal nutzbare Nachmeldelinks für Anmeldungen außerhalb des Anmeldezeitraums.
-- CreateTable
CREATE TABLE "late_registration_link" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "note" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "registrationId" TEXT,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "late_registration_link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "late_registration_link_tokenHash_key" ON "late_registration_link"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "late_registration_link_registrationId_key" ON "late_registration_link"("registrationId");

-- CreateIndex
CREATE INDEX "late_registration_link_courseId_idx" ON "late_registration_link"("courseId");

-- AddForeignKey
ALTER TABLE "late_registration_link" ADD CONSTRAINT "late_registration_link_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "late_registration_link" ADD CONSTRAINT "late_registration_link_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "late_registration_link" ADD CONSTRAINT "late_registration_link_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "CourseRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

