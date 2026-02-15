-- AlterTable
ALTER TABLE "page_view" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "page_view_userId_idx" ON "page_view"("userId");

-- AddForeignKey
ALTER TABLE "page_view" ADD CONSTRAINT "page_view_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
