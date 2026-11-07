import {
  createLearningPath,
  type PathStage,
} from "../../../_lib/learning-path";
import type { PuzzleConfig } from "./puzzle-generator";
import type { NoteValueId } from "./types";

export type WaageLesson = {
  /** Die neue Note gegen das, was so viel wiegt wie sie. */
  heavy: NoteValueId[];
  light: NoteValueId[];
  text: string;
};

export type WaageStage = PathStage &
  PuzzleConfig & {
    lesson?: WaageLesson;
    /** Zum Reinkommen zeigt die Waage jede Änderung sofort. */
    liveScale?: boolean;
  };

const stage = (
  id: string,
  title: string,
  hint: string,
  config: Omit<WaageStage, "id" | "title" | "hint">,
): WaageStage => ({ id, title, hint, ...config });

export const WAAGE_PATH = createLearningPath<WaageStage>([
  {
    title: "Ganze, Halbe, Viertel",
    hint: "Finde heraus, welche Note wie schwer ist.",
    stages: [
      stage(
        "halbe-viertel",
        "Halbe und Viertel",
        "Die Waage verrät dir alles",
        {
          values: ["half", "quarter"],
          left: [1, 2],
          right: [2, 3],
          focus: "half",
          liveScale: true,
          lesson: {
            heavy: ["half"],
            light: ["quarter", "quarter"],
            text: "Eine Halbe wiegt so viel wie zwei Viertel.",
          },
        },
      ),
      stage("ganze", "Die Ganze", "Die schwerste Note kommt dazu", {
        values: ["whole", "half", "quarter"],
        left: [1, 2],
        right: [2, 3],
        focus: "whole",
        liveScale: true,
        lesson: {
          heavy: ["whole"],
          light: ["half", "half"],
          text: "Eine Ganze wiegt so viel wie zwei Halbe.",
        },
      }),
      stage("drei-werte", "Alle drei", "Erst überlegen, dann wiegen", {
        values: ["whole", "half", "quarter"],
        left: [1, 2],
        right: [3, 4],
      }),
    ],
  },
  {
    title: "Achtel",
    hint: "Zwei leichte Noten für eine Viertel.",
    stages: [
      stage("achtel", "Die Achtel", "Leichter als die Viertel", {
        values: ["half", "quarter", "eighth"],
        left: [1, 2],
        right: [2, 4],
        focus: "eighth",
        lesson: {
          heavy: ["quarter"],
          light: ["eighth", "eighth"],
          text: "Eine Viertel wiegt so viel wie zwei Achtel.",
        },
      }),
      stage("achtel-mehr", "Mehr Achtel", "Mehr Felder, mehr Möglichkeiten", {
        values: ["half", "quarter", "eighth"],
        left: [1, 3],
        right: [3, 5],
        focus: "eighth",
      }),
      stage("gerade-alle", "Von Ganzer bis Achtel", "Alle vier zusammen", {
        values: ["whole", "half", "quarter", "eighth"],
        left: [1, 3],
        right: [3, 5],
      }),
    ],
  },
  {
    title: "Punktierte Noten",
    hint: "Der Punkt macht eine Note um die Hälfte schwerer.",
    stages: [
      stage("punkt-halbe", "Punktierte Halbe", "Ein Punkt, und sie wächst", {
        values: ["dottedHalf", "half", "quarter"],
        left: [1, 2],
        right: [2, 4],
        focus: "dottedHalf",
        lesson: {
          heavy: ["dottedHalf"],
          light: ["half", "quarter"],
          text: "Der Punkt legt die Hälfte drauf: eine Halbe und eine Viertel.",
        },
      }),
      stage(
        "punkt-viertel",
        "Punktierte Viertel",
        "Dasselbe eine Nummer kleiner",
        {
          values: ["dottedQuarter", "quarter", "eighth"],
          left: [1, 2],
          right: [2, 4],
          focus: "dottedQuarter",
          lesson: {
            heavy: ["dottedQuarter"],
            light: ["quarter", "eighth"],
            text: "Auch hier legt der Punkt die Hälfte drauf: eine Viertel und eine Achtel.",
          },
        },
      ),
      stage("punktiert-alle", "Mit und ohne Punkt", "Alles durcheinander", {
        values: [
          "whole",
          "dottedHalf",
          "half",
          "dottedQuarter",
          "quarter",
          "eighth",
        ],
        left: [1, 3],
        right: [3, 5],
      }),
    ],
  },
  {
    title: "Pausen",
    hint: "Pausen wiegen genauso viel wie ihre Noten.",
    stages: [
      stage("viertelpause", "Die Viertelpause", "Stille wiegt auch etwas", {
        values: ["half", "quarter", "restQuarter"],
        left: [1, 2],
        right: [2, 4],
        restChance: 0.8,
        lesson: {
          heavy: ["restQuarter"],
          light: ["quarter"],
          text: "Eine Viertelpause wiegt so viel wie eine Viertel.",
        },
      }),
      stage("achtelpause", "Die Achtelpause", "Die kleine Schwester", {
        values: ["quarter", "eighth", "restQuarter", "restEighth"],
        left: [1, 2],
        right: [2, 4],
        focus: "restEighth",
        restChance: 0.8,
        lesson: {
          heavy: ["restEighth"],
          light: ["eighth"],
          text: "Eine Achtelpause wiegt so viel wie eine Achtel.",
        },
      }),
      stage("pausen-alle", "Noten und Pausen", "Lies genau, was verlangt ist", {
        values: [
          "half",
          "dottedQuarter",
          "quarter",
          "eighth",
          "restQuarter",
          "restEighth",
        ],
        left: [1, 3],
        right: [3, 5],
        restChance: 0.5,
      }),
    ],
  },
  {
    title: "Sechzehntel",
    hint: "Jetzt wird es ganz leicht und ganz genau.",
    stages: [
      stage("sechzehntel", "Die Sechzehntel", "Zwei davon für eine Achtel", {
        values: ["quarter", "eighth", "sixteenth"],
        left: [1, 2],
        right: [2, 4],
        focus: "sixteenth",
        lesson: {
          heavy: ["eighth"],
          light: ["sixteenth", "sixteenth"],
          text: "Eine Achtel wiegt so viel wie zwei Sechzehntel.",
        },
      }),
      stage("punkt-achtel", "Punktierte Achtel", "Der Punkt wirkt auch hier", {
        values: ["quarter", "dottedEighth", "eighth", "sixteenth"],
        left: [1, 2],
        right: [2, 4],
        focus: "dottedEighth",
        lesson: {
          heavy: ["dottedEighth"],
          light: ["eighth", "sixteenth"],
          text: "Eine punktierte Achtel wiegt so viel wie eine Achtel und eine Sechzehntel.",
        },
      }),
      stage("sechzehntelpause", "Sechzehntelpause", "Die kleinste Pause", {
        values: [
          "quarter",
          "eighth",
          "sixteenth",
          "restEighth",
          "restSixteenth",
        ],
        left: [1, 2],
        right: [3, 5],
        focus: "restSixteenth",
        restChance: 0.6,
        lesson: {
          heavy: ["restSixteenth"],
          light: ["sixteenth"],
          text: "Eine Sechzehntelpause wiegt so viel wie eine Sechzehntel.",
        },
      }),
    ],
  },
  {
    title: "Für Profis",
    hint: "Alles, was die Notenschrift hergibt.",
    stages: [
      stage("zweiunddreissigstel", "Die 32tel", "Leichter geht es nicht", {
        values: ["eighth", "dottedSixteenth", "sixteenth", "thirtySecond"],
        left: [1, 2],
        right: [2, 4],
        focus: "thirtySecond",
        lesson: {
          heavy: ["sixteenth"],
          light: ["thirtySecond", "thirtySecond"],
          text: "Eine Sechzehntel wiegt so viel wie zwei 32tel.",
        },
      }),
      stage(
        "alles",
        "Alles zusammen",
        "Von der punktierten Ganzen bis zur 32tel",
        {
          values: [
            "dottedWhole",
            "whole",
            "dottedHalf",
            "half",
            "dottedQuarter",
            "quarter",
            "dottedEighth",
            "eighth",
            "dottedSixteenth",
            "sixteenth",
            "thirtySecond",
            "restQuarter",
            "restEighth",
            "restSixteenth",
          ],
          left: [1, 3],
          right: [3, 6],
          restChance: 0.4,
          uniqueChance: 0.2,
        },
      ),
    ],
  },
]);

export const LESSON_ROUNDS = 8;
export const CHALLENGE_ROUNDS = 10;

export type WaageRun = {
  id: string;
  steps: WaageStage[];
  palette: NoteValueId[];
  lesson: WaageLesson | null;
  liveScale: boolean;
  challengeSection: number | null;
};

export function buildRun(id: string): WaageRun {
  const challengeSection = WAAGE_PATH.parseChallengeId(id);
  const stageOfRun = WAAGE_PATH.stageById(id);
  const steps =
    challengeSection !== null
      ? WAAGE_PATH.challengeStages(challengeSection, {
          min: CHALLENGE_ROUNDS,
          max: CHALLENGE_ROUNDS,
        })
      : Array.from(
          { length: LESSON_ROUNDS },
          () => stageOfRun ?? WAAGE_PATH.stages[0]!,
        );
  return {
    id,
    steps,
    palette: [...new Set(steps.flatMap((step) => step.values))],
    lesson: challengeSection === null ? (stageOfRun?.lesson ?? null) : null,
    liveScale: challengeSection === null && stageOfRun?.liveScale === true,
    challengeSection,
  };
}
