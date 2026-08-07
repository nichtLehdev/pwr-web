-- URL identifiers for posts and ensembles, replacing UUIDs in public links.
--
-- Nullable on purpose: adding the column is then a metadata-only change that
-- needs no table rewrite, and existing rows stay valid until `pnpm
-- backfill:slugs` fills them. Postgres allows repeated NULLs under a unique
-- index, so the constraint can go on before the backfill runs.
ALTER TABLE "Post" ADD COLUMN "slug" TEXT;
ALTER TABLE "Ensemble" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Ensemble_slug_key" ON "Ensemble"("slug");
