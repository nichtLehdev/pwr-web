-- Prämien und Beitragssätze gehören ab jetzt zum Abrechnungslauf statt in globale
-- Einstellungen. Entwürfe bekommen die bisher wirksamen Werte mit: globale Werte als
-- "manual", sonst die der Tabelle. Ausgestellte Läufe haben ihre Werte schon.

-- Versicherung: je Wertklasse der Tabelle die hinterlegte oder die Tabellenprämie.
UPDATE "insurance_billing_run" AS run
SET "rates" = COALESCE((
  SELECT jsonb_agg(
           jsonb_build_object(
             'maxValue', (sheet->>'maxValue')::int,
             'netPremium', COALESCE(premium."netPremium", (sheet->>'netPremium')::float8),
             'source', CASE WHEN premium."netPremium" IS NOT NULL THEN 'manual' ELSE 'sheet' END
           )
           ORDER BY (sheet->>'maxValue')::int
         )
  FROM jsonb_array_elements(run."sheetRates") AS sheet
  LEFT JOIN "insurance_premium_rate" AS premium
    ON premium."maxValue" = (sheet->>'maxValue')::int
  WHERE premium."netPremium" IS NOT NULL OR jsonb_typeof(sheet->'netPremium') = 'number'
), '[]'::jsonb)
WHERE run."status" = 'DRAFT' OR run."rates" IS NULL;

-- Ältere ausgestellte Läufe nannten hinterlegte Prämien "settings".
UPDATE "insurance_billing_run"
SET "rates" = REPLACE("rates"::text, '"source": "settings"', '"source": "manual"')::jsonb
WHERE "rates" IS NOT NULL AND "rates"::text LIKE '%"settings"%';

-- Mitgliedsbeiträge: je Satz der globale Wert oder der aus den Formeln der Tabelle.
UPDATE "membership_billing_run" AS run
SET "rates" = jsonb_build_object(
  'baseFee', COALESCE(settings."baseFee", (run."sheetRates"->>'baseFee')::float8),
  'rateWithIncome', COALESCE(settings."rateWithIncome", (run."sheetRates"->>'rateWithIncome')::float8),
  'rateWithoutIncome', COALESCE(settings."rateWithoutIncome", (run."sheetRates"->>'rateWithoutIncome')::float8),
  'magazinePrice', COALESCE(settings."magazinePrice", (run."sheetRates"->>'magazinePrice')::float8),
  'sources', jsonb_build_object(
    'baseFee', CASE WHEN settings."baseFee" IS NOT NULL THEN 'manual' ELSE 'sheet' END,
    'rateWithIncome', CASE WHEN settings."rateWithIncome" IS NOT NULL THEN 'manual' ELSE 'sheet' END,
    'rateWithoutIncome', CASE WHEN settings."rateWithoutIncome" IS NOT NULL THEN 'manual' ELSE 'sheet' END,
    'magazinePrice', CASE WHEN settings."magazinePrice" IS NOT NULL THEN 'manual' ELSE 'sheet' END
  )
)
FROM (SELECT 1) AS one
LEFT JOIN "membership_billing_settings" AS settings ON settings."id" = 1
WHERE run."status" = 'DRAFT' OR run."rates" IS NULL;

-- AlterTable
ALTER TABLE "insurance_billing_run" ALTER COLUMN "rates" SET NOT NULL,
ALTER COLUMN "rates" SET DEFAULT '[]';

-- AlterTable
ALTER TABLE "membership_billing_run" ALTER COLUMN "rates" SET NOT NULL,
ALTER COLUMN "rates" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "membership_billing_settings" DROP COLUMN "baseFee",
DROP COLUMN "magazinePrice",
DROP COLUMN "rateWithIncome",
DROP COLUMN "rateWithoutIncome";

-- DropTable
DROP TABLE "insurance_premium_rate";
