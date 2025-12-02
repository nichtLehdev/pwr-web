-- AlterTable
ALTER TABLE "Download" ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "uploadedById" TEXT;

-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'APPROVED';

-- CreateIndex
CREATE INDEX "Download_status_idx" ON "Download"("status");

-- CreateIndex
CREATE INDEX "Download_uploadedById_idx" ON "Download"("uploadedById");

-- CreateIndex
CREATE INDEX "Media_status_idx" ON "Media"("status");

-- AddForeignKey
ALTER TABLE "Download" ADD CONSTRAINT "Download_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
