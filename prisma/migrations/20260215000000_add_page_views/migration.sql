-- CreateTable
CREATE TABLE "page_view" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "section" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_view_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_view_path_idx" ON "page_view"("path");

-- CreateIndex
CREATE INDEX "page_view_section_idx" ON "page_view"("section");

-- CreateIndex
CREATE INDEX "page_view_createdAt_idx" ON "page_view"("createdAt");
