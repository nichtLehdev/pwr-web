-- AlterTable
-- Instrument als Pflichtfeld je Kurs, Anmerkungen je Teilnehmer.
ALTER TABLE "Course" ADD COLUMN     "instrumentRequired" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "notes" TEXT;
