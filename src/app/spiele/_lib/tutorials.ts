import type { ToniMood } from "../_components/toni";
import { CHALLENGE_PASS_PERCENT } from "./learning-path";
import { scopedKey } from "./profiles/scope";

export type TutorialDemo =
  | "call-response"
  | "band"
  | "challenge"
  | "daily"
  | "endless"
  | "note-name"
  | "valves"
  | "scale"
  | "weigh"
  | "dictation";

/** Ein Takt in echter Notenschrift mit den Schlägen darunter, Tokens wie in `parseCell`. */
export type NoteDemo = { notes: string; meter?: "3/4" | "6/8" };

export type TutorialStep = {
  title: string;
  text: string;
  mood: ToniMood;
  demo: TutorialDemo | NoteDemo;
};

const note = (
  title: string,
  text: string,
  notes: string,
  meter?: NoteDemo["meter"],
): TutorialStep => ({
  title,
  text,
  mood: "idle",
  demo: { notes, meter },
});

/** Was Toni erklärt, bevor etwas zum ersten Mal drankommt. Kurz halten: zwei Sätze. */
export const TUTORIALS = {
  "rhythmus-start": [
    {
      title: "Hör zu, dann spiel nach",
      text: "Ich spiele dir einen Takt vor. Danach bist du dran: Tipp genau so, wie du es gehört hast.",
      mood: "listen",
      demo: "call-response",
    },
  ],
  // Bevor ein Notenwert zum ersten Mal drankommt; die Kennung ist die der Rhythmus-Stufe.
  "noten-viertel-halbe": [
    note(
      "Die Viertelnote",
      "Eine Viertel dauert einen Schlag. Wir sagen dazu „ta“.",
      "q q q q",
    ),
    note(
      "Die halbe Note",
      "Eine Halbe dauert zwei Schläge: „ta-a“. Halt den Knopf, bis der zweite Schlag vorbei ist.",
      "h h",
    ),
  ],
  "noten-ganze-pausen": [
    note(
      "Die ganze Note",
      "Eine Ganze dauert vier Schläge, also den ganzen Takt. Halt sie bis zum Schluss.",
      "w",
    ),
    note(
      "Pausen",
      "In einer Pause spielst du nicht und lässt los. Die Viertelpause dauert einen Schlag, die halbe Pause zwei.",
      "q rq rh",
    ),
  ],
  "noten-dreier": [
    note(
      "Der Dreiertakt",
      "Jetzt hat ein Takt nur drei Schläge. Der Punkt macht die Halbe länger: Sie dauert dann drei Schläge.",
      "hd",
      "3/4",
    ),
  ],
  "noten-achtel": [
    note(
      "Achtelnoten",
      "Zwei Achtel teilen sich einen Schlag. Sag „ti-ti“, beide gleich lang.",
      "8 8 8 8 q q",
    ),
  ],
  "noten-achtelpausen": [
    note(
      "Die Achtelpause",
      "Eine Achtelpause ist ein halber Schlag Stille. Die Achtel danach kommt kurz nach dem Schlag.",
      "r8 8 r8 8 q q",
    ),
  ],
  "noten-punktiert": [
    note(
      "Die punktierte Viertel",
      "Der Punkt macht die Viertel um die Hälfte länger: anderthalb Schläge. Danach passt genau eine Achtel.",
      "qd 8 qd 8",
    ),
  ],
  "noten-synkopen": [
    note(
      "Synkopen",
      "Der Ton kommt zwischen zwei Schlägen und klingt über den nächsten Schlag hinweg: „ti ta ti“.",
      "8 q 8 q q",
    ),
  ],
  "noten-sechzehntel": [
    note(
      "Sechzehntel",
      "Vier Sechzehntel passen auf einen Schlag. Sag schnell „ti-ri-ti-ri“.",
      "16 16 16 16 16 16 16 16 q q",
    ),
  ],
  "noten-achtel-sechzehntel": [
    note(
      "Achtel und Sechzehntel",
      "Eine Achtel und zwei Sechzehntel füllen zusammen einen Schlag: „ti ti-ri“ oder „ti-ri ti“.",
      "8 16 16 16 16 8 q q",
    ),
  ],
  "noten-punktierte-achtel": [
    note(
      "Die punktierte Achtel",
      "Sie dauert drei Sechzehntel, die Sechzehntel danach ist ganz kurz. Das klingt hüpfend.",
      "8d 16 8d 16 q q",
    ),
  ],
  "noten-sechzehntel-synkopen": [
    note(
      "Sechzehntel-Synkopen",
      "Die Achtel steht jetzt in der Mitte des Schlags, mit je einer Sechzehntel davor und danach.",
      "16 8 16 16 8 16 q q",
    ),
  ],
  "noten-triolen": [
    note(
      "Triolen",
      "Drei Triolen-Achtel teilen sich einen Schlag, alle gleich lang: „tri-o-le“.",
      "t t t t t t q q",
    ),
  ],
  "noten-sechsachtel": [
    note(
      "Der 6/8-Takt",
      "Sechs Achtel in zwei Gruppen. Du zählst zwei große Schläge mit je drei Achteln.",
      "8 8 8 8 8 8",
      "6/8",
    ),
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

/** Die Notenerklärung zu einer Rhythmus-Stufe, falls diese etwas Neues bringt. */
export function noteTutorialFor(levelId: string): TutorialId | null {
  const id = `noten-${levelId}`;
  return id in TUTORIALS ? (id as TutorialId) : null;
}

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
