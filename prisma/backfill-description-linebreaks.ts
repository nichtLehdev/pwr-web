/**
 * Harte Zeilenumbrüche aus Beschreibungen von Terminen und Kursen entfernen.
 *
 * Die Regel steht in `src/lib/description-linebreaks.ts` (mit Tests). Sie ist
 * wiederholbar: Der erste Lauf glättet die alten, im Textfeld von Hand
 * umbrochenen Texte, jeder weitere findet nichts mehr, und was der Editor
 * speichert, bleibt unberührt. Deshalb hängt das Skript wie die anderen
 * Backfills am Startbefehl in deploy/stack.yaml — auf mittwald lassen sich im
 * laufenden Container keine Skripte ausführen.
 *
 * Aufruf:  npx tsx prisma/backfill-description-linebreaks.ts
 *          npx tsx prisma/backfill-description-linebreaks.ts --dry-run
 */
import "dotenv/config";
import { db } from "@/server/db";
import { entwirreHarteUmbrueche } from "@/lib/description-linebreaks";

async function main() {
  const schreiben = !process.argv.includes("--dry-run");

  const events = await db.event.findMany({
    where: { description: { contains: "\n" } },
    select: { id: true, title: true, description: true },
  });
  const courses = await db.course.findMany({
    where: { description: { contains: "\n" } },
    select: { id: true, title: true, description: true },
  });

  let geaendert = 0;

  for (const [art, eintraege] of [
    ["Termin", events],
    ["Kurs", courses],
  ] as const) {
    for (const eintrag of eintraege) {
      const alt = eintrag.description ?? "";
      const neu = entwirreHarteUmbrueche(alt);
      if (neu === alt) continue;
      geaendert++;
      console.log(`\n=== ${art}: ${eintrag.title} (${eintrag.id})`);
      console.log(`--- vorher\n${alt}`);
      console.log(`+++ nachher\n${neu}`);
      if (!schreiben) continue;
      await db.$transaction(async (tx) => {
        if (art === "Termin") {
          await tx.event.update({
            where: { id: eintrag.id },
            data: { description: neu },
          });
        } else {
          await tx.course.update({
            where: { id: eintrag.id },
            data: { description: neu },
          });
        }
      });
    }
  }

  console.log(
    `\n${geaendert} von ${events.length + courses.length} Beschreibungen mit Umbrüchen betroffen — ${
      schreiben ? "geschrieben" : "Probelauf, nichts geschrieben"
    }`,
  );
}

main()
  .catch((fehler) => {
    console.error(fehler);
    process.exit(1);
  })
  .finally(() => void db.$disconnect());
