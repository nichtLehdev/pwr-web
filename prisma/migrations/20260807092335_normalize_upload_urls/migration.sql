-- Normalize legacy upload URLs to the canonical /api/uploads/... form.
-- The uploads serving route authorizes by looking rows up via their
-- canonical URL; legacy "/uploads/..." rows would miss the lookup and be
-- treated as record-less (session required), breaking public downloads.
-- Static assets ("/images/...", "/downloads/...") are intentionally left
-- untouched — they live in public/ and never pass through the route.
UPDATE "Media" SET "url" = '/api' || "url" WHERE "url" LIKE '/uploads/%';
UPDATE "Media" SET "path" = '/api' || "path" WHERE "path" LIKE '/uploads/%';
UPDATE "Download" SET "fileUrl" = '/api' || "fileUrl" WHERE "fileUrl" LIKE '/uploads/%';
