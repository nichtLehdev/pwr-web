-- Ein Termin kann jetzt mehrere Mitwirkende haben (z. B. zwei Posaunenchöre oder ein
-- Auswahlchor mit einem Ensemble). Die bisherigen Einzelfelder am Termin wandern in die
-- neue Tabelle "EventPerformer" und werden danach entfernt.

-- CreateTable
CREATE TABLE "EventPerformer" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" "EventEnsembleType" NOT NULL,
    "ensembleId" TEXT,
    "auswahlChorId" TEXT,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EventPerformer_pkey" PRIMARY KEY ("id"),
    -- Nur das zum Typ passende Ziel darf gesetzt sein. Ein Ziel darf leer werden,
    -- wenn das verknüpfte Ensemble gelöscht wird (ON DELETE SET NULL); dann bleibt der Name.
    CONSTRAINT "EventPerformer_target_matches_type" CHECK (
        ("type" = 'ENSEMBLE' AND "auswahlChorId" IS NULL)
        OR ("type" = 'AUSWAHLCHOR' AND "ensembleId" IS NULL)
        OR ("type" = 'CUSTOM' AND "ensembleId" IS NULL AND "auswahlChorId" IS NULL)
    )
);

-- CreateIndex
CREATE INDEX "EventPerformer_eventId_idx" ON "EventPerformer"("eventId");

-- CreateIndex
CREATE INDEX "EventPerformer_ensembleId_idx" ON "EventPerformer"("ensembleId");

-- CreateIndex
CREATE INDEX "EventPerformer_auswahlChorId_idx" ON "EventPerformer"("auswahlChorId");

-- AddForeignKey
ALTER TABLE "EventPerformer" ADD CONSTRAINT "EventPerformer_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPerformer" ADD CONSTRAINT "EventPerformer_ensembleId_fkey" FOREIGN KEY ("ensembleId") REFERENCES "Ensemble"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPerformer" ADD CONSTRAINT "EventPerformer_auswahlChorId_fkey" FOREIGN KEY ("auswahlChorId") REFERENCES "AuswahlChor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Bestehende Mitwirkende übernehmen: je Termin höchstens eine Zeile. Der freie Name
-- wird nur bei CUSTOM übernommen; bei den anderen Typen ist er oft ein Rest von einem
-- früheren Typwechsel. Termine ohne erkennbaren Namen bekommen keine Zeile (sie zeigen
-- heute auch nichts an).
INSERT INTO "EventPerformer" ("id", "eventId", "type", "ensembleId", "auswahlChorId", "name", "sortOrder")
SELECT gen_random_uuid()::text, src."eventId", src."type", src."ensembleId", src."auswahlChorId", src."name", 0
FROM (
    SELECT
        e."id" AS "eventId",
        e."performingEnsembleType" AS "type",
        CASE WHEN e."performingEnsembleType" = 'ENSEMBLE' THEN e."ensembleId" END AS "ensembleId",
        CASE WHEN e."performingEnsembleType" = 'AUSWAHLCHOR' THEN e."auswahlChorId" END AS "auswahlChorId",
        CASE e."performingEnsembleType"
            WHEN 'ENSEMBLE' THEN COALESCE(ens."name", NULLIF(TRIM(e."performingEnsembleName"), ''))
            WHEN 'AUSWAHLCHOR' THEN COALESCE(ac."name", NULLIF(TRIM(e."performingEnsembleName"), ''))
            ELSE NULLIF(TRIM(e."performingEnsembleName"), '')
        END AS "name"
    FROM "Event" e
    LEFT JOIN "Ensemble" ens ON ens."id" = e."ensembleId"
    LEFT JOIN "AuswahlChor" ac ON ac."id" = e."auswahlChorId"
    WHERE e."performingEnsembleType" IS NOT NULL
) AS src
WHERE src."name" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_ensembleId_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_auswahlChorId_fkey";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "auswahlChorId",
DROP COLUMN "ensembleId",
DROP COLUMN "performingEnsembleName",
DROP COLUMN "performingEnsembleType";
