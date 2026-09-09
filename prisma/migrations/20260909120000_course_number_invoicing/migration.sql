-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "courseNumber" TEXT;

-- CreateTable
CREATE TABLE "CourseInvoiceCounter" (
    "courseNumber" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CourseInvoiceCounter_pkey" PRIMARY KEY ("courseNumber")
);

-- CreateIndex
CREATE UNIQUE INDEX "Course_courseNumber_key" ON "Course"("courseNumber");
