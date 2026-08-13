-- URL identifiers for events and courses, replacing UUIDs in public links.
--
-- Nullable for the same reason as Post.slug and Ensemble.slug: adding the
-- column stays a metadata-only change, existing rows keep working through the
-- UUID form until `pnpm backfill:slugs` fills them, and Postgres tolerates
-- repeated NULLs under a unique index so the constraint can go on first.
ALTER TABLE "Event" ADD COLUMN "slug" TEXT;
ALTER TABLE "Course" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");
