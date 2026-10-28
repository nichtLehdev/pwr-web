-- CreateTable
-- Stand eines Inhalts bei seiner letzten Prüfung, für die Änderungsansicht.
CREATE TABLE "content_review_snapshot" (
    "id" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL,
    "fields" JSONB NOT NULL,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_review_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "content_review_snapshot_contentType_contentId_key" ON "content_review_snapshot"("contentType", "contentId");
