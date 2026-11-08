import type { ToniMood } from "../_components/toni";
import { CHALLENGE_PASS_PERCENT } from "./learning-path";
import { scopedKey } from "./profiles/scope";

export type TutorialDemo =
  | "call-response"
  | "hold"
  | "band"
  | "challenge"
  | "daily"
  | "endless"
  | "note-name"
  | "valves"
  | "scale"
  | "weigh"
  | "dictation";

export type TutorialStep = {
  title: string;
  text: string;
  mood: ToniMood;
  demo: TutorialDemo;
};

/** Was Toni erklärt, bevor etwas zum ersten Mal drankommt. Kurz halten: zwei Sätze. */
export const TUTORIALS = {
  "rhythmus-start": [
    {
      title: "Hör zu, dann spiel nach",
      text: "Ich spiele dir einen Takt vor. Danach bist du dran: Tipp genau so, wie du es gehört hast.",
      mood: "listen",
      demo: "call-response",
    },
    {
      title: "Lange Noten halten",
      text: "Eine Halbe dauert zwei Schläge. Halt den Knopf so lange gedrückt, wie der Ton klingt.",
      mood: "idle",
      demo: "hold",
    },
  ],
  "rhythmus-band": [
    {
      title: "Jetzt liest du selbst",
      text: "Die Noten fahren auf die Linie zu. Spiel jede Note genau, wenn sie die Linie berührt. Ich spiele diesmal nicht vor.",
      mood: "happy",
      demo: "band",
    },
  ],
  challenge: [
    {
      title: "Zeig, was du kannst",
      text: `Die Challenge mischt alles aus dem Abschnitt. Du hast drei Mal Puste, mit ${CHALLENGE_PASS_PERCENT} % geht der nächste Abschnitt auf.`,
      mood: "play",
      demo: "challenge",
    },
  ],
  daily: [
    {
      title: "Jeden Tag ein bisschen",
      text: "Das Tagestraining mischt Stufen, die du schon kannst. Das erste am Tag bringt doppelte XP.",
      mood: "happy",
      demo: "daily",
    },
  ],
  endless: [
    {
      title: "Wie weit kommst du?",
      text: "Endlos wird immer schwerer, bis dir die Puste ausgeht. Mit Internet zählt dein Lauf für die Bestenliste.",
      mood: "play",
      demo: "endless",
    },
  ],
  "noten-lesen-start": [
    {
      title: "Welche Note ist das?",
      text: "Schau, wo die Note im Notensystem sitzt, und tipp ihren Namen.",
      mood: "listen",
      demo: "note-name",
    },
  ],
  "griffe-start": [
    {
      title: "Zeig mir den Griff",
      text: "Du siehst eine Note. Drück die passenden Ventile oder stell den Zug ein, dann bestätige.",
      mood: "idle",
      demo: "valves",
    },
  ],
  "notenwaage-start": [
    {
      title: "Bring die Waage ins Gleichgewicht",
      text: "Links liegen Noten. Leg rechts Noten drauf, die zusammen genauso lange dauern.",
      mood: "happy",
      demo: "scale",
    },
  ],
  "notenwaage-wiegen": [
    {
      title: "Erst überlegen, dann wiegen",
      text: "Ab jetzt bewegt sich die Waage erst, wenn du auf Wiegen drückst. Rechne vorher gut nach.",
      mood: "listen",
      demo: "weigh",
    },
  ],
  "diktat-start": [
    {
      title: "Hör genau hin",
      text: "Ich spiele dir einen Rhythmus vor. Such die Noten aus, die genau so klingen.",
      mood: "listen",
      demo: "dictation",
    },
  ],
} satisfies Record<string, readonly TutorialStep[]>;

export type TutorialId = keyof typeof TUTORIALS;

const SEEN_KEY = "pwr.spiele.v1.tutorials";

/** Je Profil, damit Geschwister auf demselben Login die Erklärung auch sehen. */
export function loadSeenTutorials(): Set<string> {
  try {
    const raw = localStorage.getItem(scopedKey(SEEN_KEY));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === "string")
        : [],
    );
  } catch {
    return new Set();
  }
}

export function markTutorialsSeen(ids: readonly TutorialId[]): void {
  try {
    const seen = loadSeenTutorials();
    for (const id of ids) seen.add(id);
    localStorage.setItem(scopedKey(SEEN_KEY), JSON.stringify([...seen]));
  } catch {
    /* Ohne Speicher kommt die Erklärung eben wieder. */
  }
}

export function unseenTutorials(
  ids: readonly (TutorialId | null | undefined)[],
): TutorialId[] {
  const seen = loadSeenTutorials();
  return ids.filter((id): id is TutorialId => !!id && !seen.has(id));
}
