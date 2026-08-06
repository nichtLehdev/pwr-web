/** Zentrale Spiele-Übersicht — Quelle für Übersichtskarten, Shell-Titel, Suche und Statistik. */

export type GameId = "rhythmus" | "noten-lesen" | "griffe" | "notenwaage";

export type GameDefinition = {
  slug: GameId;
  /** Kurzer Titel für die Spiel-Leiste und Metadata. */
  title: string;
  /** Titel der Karte auf der Übersichtsseite. */
  cardTitle: string;
  /** Beschreibung auf der Übersichtskarte. */
  cardDescription: string;
  /** SEO-/Metadata-Beschreibung. */
  metaDescription: string;
  /** Zusätzliche Begriffe für die Seiten-Suche. */
  searchKeywords: readonly string[];
};

export const GAMES: readonly GameDefinition[] = [
  {
    slug: "rhythmus",
    title: "Rhythmus",
    cardTitle: "Rhythmus-Training",
    cardDescription:
      "Rhythmus lesen und mit Tippen wiedergeben — mit Metronom und Auswertung",
    metaDescription:
      "Rhythmus mitspielen: Vorgegebene Figur im Metronom-Takt tippen und Auswertung sehen.",
    searchKeywords: [
      "rhythmus",
      "rhythmustraining",
      "metronom",
      "takt",
      "tippen",
      "klatschen",
      "timing",
    ],
  },
  {
    slug: "noten-lesen",
    title: "Noten lesen",
    cardTitle: "Noten lesen",
    cardDescription:
      "Einzelne Noten im Schlüssel erkennen — Instrument, Modus und Schwierigkeit wählbar",
    metaDescription:
      "Noten lesen üben: Tonnamen zum Violin- oder Bassschlüssel wählen — mit Schwierigkeitsstufen für Blechblasinstrumente.",
    searchKeywords: [
      "noten",
      "noten lesen",
      "notenlesen",
      "tonnamen",
      "violinschlüssel",
      "bassschlüssel",
      "notenschlüssel",
      "quiz",
    ],
  },
  {
    slug: "griffe",
    title: "Griffe",
    cardTitle: "Griffe",
    cardDescription:
      "Noten lesen und die passenden Ventile oder Zugpositionen wählen — mit Sofort-Feedback",
    metaDescription:
      "Griffe üben: Note im System — Ventile oder Zugposition wählen, mit Merkhilfen und Modi für Blechblasinstrumente.",
    searchKeywords: [
      "griffe",
      "grifftabelle",
      "ventile",
      "zugposition",
      "trompete",
      "posaune",
      "fingersatz",
    ],
  },
  {
    slug: "notenwaage",
    title: "Notenwaage",
    cardTitle: "Notenwaage",
    cardDescription:
      "Notenwerte auf der rechten Seite ergänzen, bis die Waage mit links genau ausgeglichen ist",
    metaDescription:
      "Notenwerte ausgleichen: links vorgegeben, rechts auffüllen bis die Waage im Gleichgewicht ist.",
    searchKeywords: [
      "notenwaage",
      "notenwerte",
      "waage",
      "schläge",
      "pausen",
      "rechnen",
      "puzzle",
    ],
  },
];

/** Angekündigte Spiele ohne Route — nur als Karte auf der Übersicht. */
export const UPCOMING_GAMES: readonly Pick<
  GameDefinition,
  "cardTitle" | "cardDescription"
>[] = [
  {
    cardTitle: "Choräle-Raten",
    cardDescription:
      "Erkenne den Choral anhand der ersten Takte der Melodie in den Noten",
  },
];

export function gameBySlug(
  slug: string | null | undefined,
): GameDefinition | null {
  if (!slug) return null;
  return GAMES.find((g) => g.slug === slug) ?? null;
}
