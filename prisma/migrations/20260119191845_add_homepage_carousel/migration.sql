-- CreateTable
CREATE TABLE "HomepageCarouselItem" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageCarouselItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomepageCarouselItem_sortOrder_idx" ON "HomepageCarouselItem"("sortOrder");

-- CreateIndex
CREATE INDEX "HomepageCarouselItem_isActive_idx" ON "HomepageCarouselItem"("isActive");

-- AddForeignKey
ALTER TABLE "HomepageCarouselItem" ADD CONSTRAINT "HomepageCarouselItem_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
