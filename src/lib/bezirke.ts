/**
 * The 13 Bezirke (districts) of the Posaunenwerk Rheinland.
 *
 * Hardcoded like the permissions (src/lib/permissions.ts): the districts
 * essentially never change and have no management UI. The list is synced
 * into the database by prisma/post-migration-setup.ts (upsert by the
 * unique `number`), which runs automatically on every app start in the
 * mittwald stack.
 */
export const BEZIRKE: ReadonlyArray<{
  number: number;
  name: string;
  shortName: string;
}> = [
  {
    number: 1,
    name: "Bezirk 01 - Unterer Niederrhein",
    shortName: "Unterer Niederrhein",
  },
  {
    number: 2,
    name: "Bezirk 02 - Rhein-Lippe",
    shortName: "Rhein-Lippe",
  },
  {
    number: 3,
    name: "Bezirk 03 - Essen-Mülheim",
    shortName: "Essen-Mülheim",
  },
  {
    number: 4,
    name: "Bezirk 04 - Düsseldorf-Krefeld-Niederberg",
    shortName: "Düsseldorf-Krefeld-Niederberg",
  },
  {
    number: 5,
    name: "Bezirk 05 - Bergisches Land",
    shortName: "Bergisches Land",
  },
  {
    number: 6,
    name: "Bezirk 06 - Köln",
    shortName: "Köln",
  },
  {
    number: 7,
    name: "Bezirk 07 - Aachen-Jülich",
    shortName: "Aachen-Jülich",
  },
  {
    number: 8,
    name: "Bezirk 08 - Bonn",
    shortName: "Bonn",
  },
  {
    number: 9,
    name: "Bezirk 09 - Oberbergisches Land",
    shortName: "Oberbergisches Land",
  },
  {
    number: 10,
    name: "Bezirk 10 - Wied",
    shortName: "Wied",
  },
  {
    number: 11,
    name: "Bezirk 11 - An Nahe und Glan",
    shortName: "An Nahe und Glan",
  },
  {
    number: 12,
    name: "Bezirk 12 - Saarland",
    shortName: "Saarland",
  },
  {
    number: 13,
    name: "Bezirk 13 - An Sieg und Rhein",
    shortName: "An Sieg und Rhein",
  },
];
