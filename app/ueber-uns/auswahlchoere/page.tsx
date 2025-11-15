import { promises as fs } from "fs";
import path from "path";
import AuswahlchoereClient from "@/components/AuswahlchoereClient";

async function getImageCount(slug: string): Promise<number> {
  const dirPath = path.join(
    process.cwd(),
    "public",
    "images",
    "auswahlchoere",
    slug
  );

  try {
    const files = await fs.readdir(dirPath);
    const imageFiles = files.filter((file) =>
      /\.(jpg|jpeg|png|webp)$/i.test(file)
    );
    return imageFiles.length;
  } catch {
    return 0;
  }
}

export default async function AuswahlchoerePage() {
  const ensemblesData = [
    {
      name: "Con Spirito",
      slug: "conspirito",
      subtitle: "Das Spitzenensemble des Posaunenwerks",
      founded: "2006",
      members: "12 Mitglieder",
      director: "LPW Jörg Häusler",
      description:
        "Wenn das Ganze mehr ist, als die Summe seiner Teile und Musik mit Herzblut und Tiefe erklingt, dann kommt Con Spirito ins Spiel. Das zwölfköpfige Ensemble repräsentiert das Posaunenwerk und die Evangelische Kirche im Rheinland. Geführt von LPW Jörg Häusler verbindet die MusikerInnen seit 2006 ein engagierter Weg durch musikalische Zeit- und Stilepochen, hörbare Spielfreude und die Lust an lebendiger Musik.",
      highlights: [
        "Repräsentiert das Posaunenwerk Rheinland",
        "Musikalische Vielfalt durch Zeit- und Stilepochen",
        "Engagierte Musikerinnen und Musiker",
        "Hörbare Spielfreude und Leidenschaft",
      ],
      color: "bg-primary",
      colorHex: "#faa619",
      concerts: [
        {
          date: "2025-12-15",
          title: "Weihnachtskonzert",
          location: "Johanneskirche, Düsseldorf",
          type: "Konzert",
        },
        {
          date: "2026-03-20",
          title: "Frühjahrskonzert",
          location: "Friedenskirche, Köln",
          type: "Konzert",
        },
        {
          date: "2026-06-14",
          title: "Sommerkonzert",
          location: "Christuskirche, Bonn",
          type: "Konzert",
        },
      ],
    },
    {
      name: "Buccinate Deo",
      slug: "buccinate",
      subtitle: "Musik als Verkündigungsdienst",
      founded: "1986",
      members: "10 Mitglieder",
      director: "LPW Jörg Häusler",
      description:
        "BUCCINATE DEO wurde 1986 als ein Blechbläserensemble im Posaunenwerk der Evangelischen Kirche im Rheinland gegründet. Ihm gehören derzeit zehn Bläserinnen und Bläser an, die größtenteils aus der Posaunenchorarbeit evangelischer Kirchengemeinden im Rheinland hervorgegangen sind. Der Name Buccinate Deo bedeutet -frei übersetzt- Spielet dem Herrn und bringt zum Ausdruck, dass das Ensemble im weitesten Sinne seine musikalischen Aktivitäten als Verkündigungsdienst versteht.",
      highlights: [
        "Seit 1986 aktiv",
        'Name bedeutet "Spielet dem Herrn"',
        "Musik als Verkündigungsdienst",
        "Aus der rheinischen Posaunenchorarbeit hervorgegangen",
      ],
      color: "bg-district-3",
      colorHex: "#8b5cf6",
      concerts: [
        {
          date: "2025-11-30",
          title: "Adventskonzert",
          location: "Kreuzkirche, Aachen",
          type: "Konzert",
        },
        {
          date: "2026-04-05",
          title: "Passionskonzert",
          location: "Erlöserkirche, Wuppertal",
          type: "Konzert",
        },
        {
          date: "2026-09-27",
          title: "Erntedankgottesdienst",
          location: "Matthäuskirche, Essen",
          type: "Gottesdienst",
        },
      ],
    },
    {
      name: "Rheinischer Landesjugendposaunenchor",
      slug: "jupo",
      subtitle: "LaJuPo - Für junge Talente",
      founded: "2013",
      members: "ca. 35 Mitglieder",
      director: "LPW Jörg Häusler",
      description:
        "Der Rheinische Landesjugendposaunenchor - kurz LaJuPo - ist ein festes Auswahlensemble mit ca. 35 Bläserinnen und Bläsern. Er bietet engagierten und talentierten Jugendlichen die Möglichkeit, über ihren Einsatz im Posaunenchor hinaus anspruchsvoll miteinander zu musizieren. Alle zwei Jahre setzt sich der Chor neu zusammen.",
      highlights: [
        "Für Jugendliche von 15-25 Jahren",
        "Vorspiel alle 2 Jahre erforderlich",
        "Mitgliedschaft für zwei Jahre bindend",
        "3-4 Probewochenenden pro Jahr",
        "3-4 Konzerte pro Jahr",
        "Nächste Legislatur beginnt 2027",
      ],
      color: "bg-district-2",
      colorHex: "#10b981",
      showApplication: true,
      concerts: [
        {
          date: "2027-03-15",
          title: "Vorspiel für neue Legislatur 2027-2029",
          location: "Landeskirchliches Archiv, Düsseldorf",
          type: "Vorspiel",
        },
        {
          date: "2027-05-20",
          title: "Erstes Konzert der neuen Legislatur",
          location: "Christuskirche, Bonn",
          type: "Konzert",
        },
        {
          date: "2027-10-10",
          title: "Herbstkonzert",
          location: "Friedenskirche, Köln",
          type: "Konzert",
        },
      ],
    },
  ];

  const ensemblesWithCounts = await Promise.all(
    ensemblesData.map(async (ensemble) => {
      const imageCount = await getImageCount(ensemble.slug);
      return {
        ...ensemble,
        imageCount: imageCount,
      };
    })
  );
  return <AuswahlchoereClient ensembles={ensemblesWithCounts} />;
}
