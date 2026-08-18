-- Teilnehmer verweisen künftig per id auf ihre Preiskategorie.
--
-- Grund: `Participant.priceOption` hält nur das Label, und ein Kurs darf zwei
-- Kategorien mit demselben Label führen (dieselbe Zimmerart in zwei Häusern,
-- unterschieden über die Beschreibung). Belegungszählung und Restplatzanzeige
-- haben beide zusammengeworfen.

ALTER TABLE "Participant" ADD COLUMN "priceOptionId" TEXT;

CREATE INDEX "Participant_priceOptionId_idx" ON "Participant"("priceOptionId");

ALTER TABLE "Participant"
  ADD CONSTRAINT "Participant_priceOptionId_fkey"
  FOREIGN KEY ("priceOptionId") REFERENCES "CoursePriceOption"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill nur dort, wo das Label innerhalb des Kurses eindeutig ist. Bei
-- Duplikaten ist nachträglich nicht mehr feststellbar, welche der beiden
-- Kategorien gewählt wurde — dort bleibt die Spalte null.
WITH unique_options AS (
  SELECT "courseId", "label", min("id") AS "id"
  FROM "CoursePriceOption"
  GROUP BY "courseId", "label"
  HAVING count(*) = 1
)
UPDATE "Participant" p
SET "priceOptionId" = u."id"
FROM "CourseRegistration" r, unique_options u
WHERE p."registrationId" = r."id"
  AND u."courseId" = r."courseId"
  AND u."label" = p."priceOption"
  AND p."priceOption" IS NOT NULL;

-- Jeden Teilnehmer festhalten, dem keine Kategorie zugeordnet werden konnte.
-- Zwei Ursachen: das Label kommt im Kurs mehrfach vor (nicht rekonstruierbar),
-- oder es passt auf gar keine Kategorie mehr (Kategorie gelöscht oder
-- umbenannt). Ohne diesen Eintrag wäre nirgends sichtbar, welche Zeilen
-- nachgepflegt werden müssen.
INSERT INTO "audit_log" ("id", "actorId", "actorEmail", "action", "entityType", "entityId", "details", "createdAt")
SELECT
  gen_random_uuid()::text,
  NULL,
  NULL,
  'participant.price_option_unresolved',
  'participant',
  p."id",
  jsonb_build_object(
    'priceOption', p."priceOption",
    'courseId', r."courseId",
    'registrationId', r."id",
    'candidates', COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('id', o."id", 'price', o."price", 'description', o."description"))
        FROM "CoursePriceOption" o
        WHERE o."courseId" = r."courseId" AND o."label" = p."priceOption"
      ),
      '[]'::jsonb
    ),
    'reason', CASE
      WHEN EXISTS (
        SELECT 1 FROM "CoursePriceOption" o
        WHERE o."courseId" = r."courseId" AND o."label" = p."priceOption"
      )
      THEN 'Label kommt im Kurs mehrfach vor; die gewählte Kategorie ist nicht mehr rekonstruierbar.'
      ELSE 'Label passt auf keine Kategorie des Kurses; sie wurde gelöscht oder umbenannt.'
    END
  ),
  NOW()
FROM "Participant" p
JOIN "CourseRegistration" r ON r."id" = p."registrationId"
WHERE p."priceOption" IS NOT NULL
  AND p."priceOptionId" IS NULL;
