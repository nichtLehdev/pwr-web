/*
  Warnings:

  - You are about to drop the column `registrantChoir` on the `CourseRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `registrantDistrict` on the `CourseRegistration` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "imageId" TEXT;

-- AlterTable
ALTER TABLE "CourseRegistration" DROP COLUMN "registrantChoir",
DROP COLUMN "registrantDistrict";

-- CreateTable
CREATE TABLE "EventDownload" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "downloadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventDownload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventDownload_eventId_idx" ON "EventDownload"("eventId");

-- CreateIndex
CREATE INDEX "EventDownload_downloadId_idx" ON "EventDownload"("downloadId");

-- CreateIndex
CREATE UNIQUE INDEX "EventDownload_eventId_downloadId_key" ON "EventDownload"("eventId", "downloadId");

-- AddForeignKey
ALTER TABLE "EventDownload" ADD CONSTRAINT "EventDownload_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventDownload" ADD CONSTRAINT "EventDownload_downloadId_fkey" FOREIGN KEY ("downloadId") REFERENCES "Download"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
