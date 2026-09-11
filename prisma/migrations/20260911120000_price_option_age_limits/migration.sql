-- Altersgrenzen je Preiskategorie.
--
-- Beide Spalten sind optional und bleiben für Bestandskurse null: eine
-- Kategorie ohne Grenzen steht weiterhin jedem offen, also ändert die
-- Migration an bestehenden Anmeldungen nichts.

ALTER TABLE "CoursePriceOption" ADD COLUMN "minAge" INTEGER;
ALTER TABLE "CoursePriceOption" ADD COLUMN "maxAge" INTEGER;
