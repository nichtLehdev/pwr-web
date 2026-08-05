-- CreateTable
CREATE TABLE "InvoiceCounter" (
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceCounter_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "rateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT,
    "count" INTEGER,
    "lastRequest" BIGINT,

    CONSTRAINT "rateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rateLimit_key_idx" ON "rateLimit"("key");

-- CreateIndex
CREATE INDEX "Course_status_endDate_idx" ON "Course"("status", "endDate");

-- CreateIndex
CREATE INDEX "Course_createdById_idx" ON "Course"("createdById");

-- CreateIndex
CREATE INDEX "CourseCustomField_courseId_idx" ON "CourseCustomField"("courseId");

-- CreateIndex
CREATE INDEX "CoursePriceOption_courseId_idx" ON "CoursePriceOption"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseRegistration_invoiceId_key" ON "CourseRegistration"("invoiceId");

-- CreateIndex
CREATE INDEX "CourseRegistration_courseId_registrationStatus_idx" ON "CourseRegistration"("courseId", "registrationStatus");

-- CreateIndex
CREATE INDEX "CourseRegistration_registrantId_idx" ON "CourseRegistration"("registrantId");

-- CreateIndex
CREATE INDEX "Download_fileUrl_idx" ON "Download"("fileUrl");

-- CreateIndex
CREATE INDEX "Event_status_eventDate_idx" ON "Event"("status", "eventDate");

-- CreateIndex
CREATE INDEX "Event_createdById_idx" ON "Event"("createdById");

-- CreateIndex
CREATE INDEX "EventPriceOption_eventId_idx" ON "EventPriceOption"("eventId");

-- CreateIndex
CREATE INDEX "Media_url_idx" ON "Media"("url");

-- CreateIndex
CREATE INDEX "Participant_registrationId_idx" ON "Participant"("registrationId");

-- CreateIndex
CREATE INDEX "Participant_priceOption_idx" ON "Participant"("priceOption");

-- CreateIndex
CREATE INDEX "Post_status_pinned_createdAt_idx" ON "Post"("status", "pinned", "createdAt");

-- CreateIndex
CREATE INDEX "Post_createdById_idx" ON "Post"("createdById");

-- CreateIndex
CREATE INDEX "page_view_createdAt_path_idx" ON "page_view"("createdAt", "path");

-- CreateIndex
CREATE INDEX "page_view_userId_createdAt_idx" ON "page_view"("userId", "createdAt");

