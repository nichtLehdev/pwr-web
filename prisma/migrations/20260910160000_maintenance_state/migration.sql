-- CreateTable
CREATE TABLE "maintenance_state" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT,
    "until" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "maintenance_state_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "maintenance_state" ADD CONSTRAINT "maintenance_state_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Der Wartungsmodus ist ein einzeiliger Datensatz. Die Zeile wird hier
-- angelegt, damit die Anwendung sie nur noch lesen und aktualisieren muss und
-- kein Codepfad mit "Zeile fehlt" umgehen können muss.
INSERT INTO "maintenance_state" ("id", "enabled", "updatedAt")
VALUES (1, false, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
