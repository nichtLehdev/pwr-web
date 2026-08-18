-- Zahlungsstatus wandert von der Anmeldung an die Rechnung.
--
-- Reihenfolge ist wichtig: erst die neuen Spalten anlegen, dann die
-- vorhandenen "bezahlt"-Markierungen übertragen, erst danach die alte Spalte
-- entfernen. Was sich nicht übertragen lässt, landet im Audit-Log statt
-- ersatzlos verloren zu gehen.

-- 1) Zahlungsfelder an der Rechnung.
ALTER TABLE "invoice"
  ADD COLUMN "paidAt"      TIMESTAMP(3),
  ADD COLUMN "paidAmount"  DOUBLE PRECISION,
  ADD COLUMN "paidById"    TEXT,
  ADD COLUMN "paymentNote" TEXT;

CREATE INDEX "invoice_courseId_paidAt_idx" ON "invoice"("courseId", "paidAt");

ALTER TABLE "invoice"
  ADD CONSTRAINT "invoice_paidById_fkey"
  FOREIGN KEY ("paidById") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 2) Bestehende PAID-Anmeldungen auf ihre ausgestellten Rechnungen übertragen.
--    Ein exaktes Zahldatum gibt es nicht — `updatedAt` der Anmeldung ist der
--    nächstliegende Zeitpunkt, an dem der Status gesetzt worden sein kann.
UPDATE "invoice" i
SET "paidAt" = COALESCE(r."updatedAt", i."publishedAt", NOW()),
    "paymentNote" = 'Aus dem Zahlungsstatus der Anmeldung übernommen (Migration 20260818120000).'
FROM "CourseRegistration" r
WHERE i."registrationId" = r."id"
  AND i."status" = 'PUBLISHED'
  AND r."paymentStatus" = 'PAID';

-- 3) Alles, was keine ausgestellte Rechnung hat (Barzahlung, Kurse ohne
--    Rechnungsstellung, Erstattungen), im Audit-Log festhalten. Diese
--    Anmeldungen verlieren ihre Zahlungsmarkierung — die Einträge hier sind
--    die einzige Spur davon.
INSERT INTO "audit_log" ("id", "actorId", "actorEmail", "action", "entityType", "entityId", "details", "createdAt")
SELECT
  gen_random_uuid()::text,
  NULL,
  NULL,
  'registration.payment_status_dropped',
  'registration',
  r."id",
  jsonb_build_object(
    'paymentStatus', r."paymentStatus"::text,
    'courseId', r."courseId",
    'registrantEmail', r."registrantEmail",
    'totalPrice', r."totalPrice",
    'reason', 'Zahlungsstatus wird an der Rechnung geführt; zu dieser Anmeldung existiert keine ausgestellte Rechnung.'
  ),
  NOW()
FROM "CourseRegistration" r
WHERE r."paymentStatus" <> 'PENDING'
  AND NOT (
    r."paymentStatus" = 'PAID'
    AND EXISTS (
      SELECT 1 FROM "invoice" i
      WHERE i."registrationId" = r."id" AND i."status" = 'PUBLISHED'
    )
  );

-- 4) Alte Spalte und Enum entfernen.
DROP INDEX "CourseRegistration_paymentStatus_idx";

ALTER TABLE "CourseRegistration" DROP COLUMN "paymentStatus";

DROP TYPE "PaymentStatus";
