/**
 * Harte Zeilenumbrüche aus Beschreibungen von Terminen und Kursen entfernen.
 *
 * Hintergrund: Beschreibungen werden seit #311 als Markdown angezeigt, und
 * jeder einzelne Zeilenumbruch bleibt dabei ein Umbruch (`breaks: true`) —
 * anders als vorher, wo alle Umbrüche verschwanden und der Text als ein Block
 * ohne Absätze stand. Das ist für gewollte Umbrüche richtig („Leitung: …“ /
 * „Zielgruppe: …“, gemessen 9 von 16 Umbrüchen im Bestand). Die übrigen 7
 * stammen aus der Eingabe: Die Redaktion hat im Textfeld von Hand umbrochen,
 * mitten im Satz. Die stehen jetzt sichtbar im Satz und gehören aus den Daten
 * heraus, nicht in eine Sonderregel der Anzeige.
 *
 * Die Regel fügt zwei Zeilen nur zusammen, wenn der Satz erkennbar weiterläuft:
 * Die nächste Zeile beginnt klein, oder die vorige endet auf ein Funktionswort
 * („und“, „den“, „mit“, „ihren“ …). Endet eine Zeile mit Satzzeichen, beginnt
 * die nächste eine Aufzählung oder steht sie für sich („… und Team“ /
 * „Zielgruppe: …“), bleibt der Umbruch.
 *
 * Standard ist ein Probelauf. Erst `--apply` schreibt, und dann einzeln in
 * einer Transaktion, damit ein Fehler nichts halb Geschriebenes hinterlässt.
 *
 *   pnpm exec tsx prisma/backfill-description-linebreaks.ts
 *   pnpm exec tsx prisma/backfill-description-linebreaks.ts --apply
 */
import "dotenv/config";
import { db } from "@/server/db";

/**
 * Wörter, nach denen ein Satz weiterläuft, auch wenn das nächste Wort groß
 * beginnt — im Deutschen sind das die Artikel, Präpositionen, Konjunktionen
 * und Pronomen vor einem Substantiv („nach den \n Sommerferien“).
 */
const FUNKTIONSWOERTER = new Set([
  "aber",
  "als",
  "am",
  "an",
  "auf",
  "aus",
  "bei",
  "beim",
  "bis",
  "das",
  "dem",
  "den",
  "der",
  "des",
  "die",
  "durch",
  "ein",
  "eine",
  "einem",
  "einen",
  "einer",
  "eines",
  "für",
  "gegen",
  "ihr",
  "ihre",
  "ihrem",
  "ihren",
  "ihrer",
  "im",
  "in",
  "mit",
  "nach",
  "oder",
  "ohne",
  "pro",
  "seine",
  "seinem",
  "seinen",
  "seiner",
  "sowie",
  "über",
  "um",
  "und",
  "unser",
  "unsere",
  "unserem",
  "unseren",
  "unserer",
  "unter",
  "vom",
  "von",
  "vor",
  "während",
  "zu",
  "zum",
  "zur",
]);

const SATZENDE = /[.!?:;)\]"»“]\s*$/;
const LISTENANFANG = /^\s*([-*+>#]|\d+[.)])\s/;

/** Läuft der Satz von `vorige` in `naechste` weiter? */
function laeuftWeiter(vorige: string, naechste: string): boolean {
  if (!vorige.trim() || !naechste.trim()) return false;
  if (SATZENDE.test(vorige)) return false;
  if (LISTENANFANG.test(naechste) || LISTENANFANG.test(vorige)) return false;
  // Zwei Leerzeichen am Zeilenende sind in Markdown ein ausdrücklicher Umbruch.
  if (/ {2}$/.test(vorige)) return false;
  if (/^[a-zäöüß]/.test(naechste.trimStart())) return true;
  const letztesWort = vorige.trim().split(/\s+/).pop() ?? "";
  return FUNKTIONSWOERTER.has(letztesWort.toLowerCase());
}

export function entwirreHarteUmbrueche(text: string): string {
  const zeilen = text.split("\n");
  const raus: string[] = [];
  for (const zeile of zeilen) {
    const vorige = raus[raus.length - 1];
    if (vorige !== undefined && laeuftWeiter(vorige, zeile)) {
      raus[raus.length - 1] = `${vorige.trimEnd()} ${zeile.trimStart()}`;
    } else {
      raus.push(zeile);
    }
  }
  return raus.join("\n");
}

async function main() {
  const schreiben = process.argv.includes("--apply");

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
      schreiben
        ? "geschrieben"
        : "Probelauf, nichts geschrieben (--apply schreibt)"
    }`,
  );
}

main()
  .catch((fehler) => {
    console.error(fehler);
    process.exit(1);
  })
  .finally(() => void db.$disconnect());
