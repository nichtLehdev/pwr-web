/**
 * Profilnamen aus festen Listen: Eigenschaft plus Musikwort. Kinder würfeln neu,
 * tippen aber nie selbst; so steht in keiner Rangliste etwas Unpassendes.
 */

type Gender = "m" | "f" | "n";

export const NAME_ADJECTIVES = [
  "Flink",
  "Mutig",
  "Munter",
  "Fröhlich",
  "Schlau",
  "Tapfer",
  "Flott",
  "Heiter",
  "Sonnig",
  "Emsig",
  "Kühn",
  "Lustig",
  "Wach",
  "Pfiffig",
  "Strahlend",
  "Fix",
] as const;

export const NAME_NOUNS = {
  Posaune: "f",
  Trompete: "f",
  Tuba: "f",
  Note: "f",
  Fanfare: "f",
  Melodie: "f",
  Triole: "f",
  Bass: "m",
  Takt: "m",
  Akkord: "m",
  Rhythmus: "m",
  Triller: "m",
  Ton: "m",
  Dreiklang: "m",
  Horn: "n",
  Flügelhorn: "n",
  Tenorhorn: "n",
  Metronom: "n",
  Kornett: "n",
  Euphonium: "n",
  Signal: "n",
} as const satisfies Record<string, Gender>;

export type NameAdjective = (typeof NAME_ADJECTIVES)[number];
export type NameNoun = keyof typeof NAME_NOUNS;

const ENDING: Record<Gender, string> = { m: "er", f: "e", n: "es" };

export function isNameAdjective(value: string): value is NameAdjective {
  return (NAME_ADJECTIVES as readonly string[]).includes(value);
}

export function isNameNoun(value: string): value is NameNoun {
  return Object.hasOwn(NAME_NOUNS, value);
}

/** „Flinke Posaune“, „Mutiger Bass“, „Fröhliches Horn“. */
export function profileName(adjective: string, noun: string): string {
  if (!isNameAdjective(adjective) || !isNameNoun(noun)) return "Spieler:in";
  return `${adjective}${ENDING[NAME_NOUNS[noun]]} ${noun}`;
}

export function randomName(
  rng: () => number = Math.random,
  avoid?: { adjective: string; noun: string },
): { adjective: NameAdjective; noun: NameNoun } {
  const nouns = Object.keys(NAME_NOUNS) as NameNoun[];
  for (;;) {
    const adjective =
      NAME_ADJECTIVES[Math.floor(rng() * NAME_ADJECTIVES.length)]!;
    const noun = nouns[Math.floor(rng() * nouns.length)]!;
    if (adjective !== avoid?.adjective || noun !== avoid?.noun) {
      return { adjective, noun };
    }
  }
}
