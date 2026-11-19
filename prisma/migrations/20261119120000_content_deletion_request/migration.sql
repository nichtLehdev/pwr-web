-- CreateEnum
CREATE TYPE "ContentDeletionRequestStatus" AS ENUM ('OPEN', 'DONE', 'DECLINED');

-- CreateTable
-- Löschanträge von Obleuten für Inhalte, die sie selbst nicht löschen dürfen.
CREATE TABLE "content_deletion_request" (
    "id" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "contentTitle" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ContentDeletionRequestStatus" NOT NULL DEFAULT 'OPEN',
    "requestedById" TEXT,
    "decidedById" TEXT,
    "decisionNote" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_deletion_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_deletion_request_contentType_contentId_status_idx" ON "content_deletion_request"("contentType", "contentId", "status");

-- CreateIndex
CREATE INDEX "content_deletion_request_status_createdAt_idx" ON "content_deletion_request"("status", "createdAt");

