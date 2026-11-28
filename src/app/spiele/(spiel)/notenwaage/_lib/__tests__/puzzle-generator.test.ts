import { describe, expect, it } from "@jest/globals";
import {
  countWays,
  createPuzzle,
  isTrivialCopy,
  puzzleSignature,
  totalUnits,
} from "../puzzle-generator";
import { buildRun, WAAGE_PATH } from "../stages";
import { NOTE_VALUES, type NoteValueId } from "../types";

const STAGES = WAAGE_PATH.stages;
const BASICS: NoteValueId[] = ["whole", "half", "quarter"];
const ALLES = WAAGE_PATH.stageById("alles")!;
const ALL_VALUES = [...ALLES.values];

/** Unabhängiger Brute-Force-Löser über Multisets, bewusst ohne Memoisierung. */
function bruteForceWays(
  values: NoteValueId[],
  target: number,
  count: number,
  requiredRests?: number,
): number {
  const sorted = [...values].sort(
    (a, b) => NOTE_VALUES[a].units - NOTE_VALUES[b].units,
  );
  let found = 0;
  const rec = (startIdx: number, slots: number, sum: number, rests: number) => {
    if (slots === 0) {
      if (sum === target && (requiredRests == null || rests === requiredRests))
        found += 1;
      return;
    }
    for (let i = startIdx; i < sorted.length; i++) {
      const def = NOTE_VALUES[sorted[i]!];
      if (sum + def.units > target) break;
      rec(i, slots - 1, sum + def.units, rests + (def.isRest ? 1 : 0));
    }
  };
  rec(0, count, 0, 0);
  return found;
}

describe("countWays", () => {
  it("zählt Multisets, keine Reihenfolgen: {Viertel, Halbe} ist EINE Lösung", () => {
    // 24 + 48 = 72 — eine Kombination, nicht zwei Reihenfolgen.
    expect(countWays(["quarter", "half"], 72, 2)).toBe(1);
  });

  it("zählt exakt: Beispiele mit bekannter Lösungsmenge", () => {
    // Ziel 96 mit 2 Symbolen aus {Ganze, Halbe, Viertel}: nur {Halbe, Halbe}.
    expect(countWays(BASICS, 96, 2)).toBe(1);
    // Ziel 96 mit 3 Symbolen: nur {Halbe, Viertel, Viertel}.
    expect(countWays(BASICS, 96, 3)).toBe(1);
    // Ziel 48 mit 2 Symbolen: nur {Viertel, Viertel}.
    expect(countWays(BASICS, 48, 2)).toBe(1);
    // Unlösbar: Ziel 96 mit 2 Symbolen, aber nur Viertel verfügbar.
    expect(countWays(["quarter"], 96, 2)).toBe(0);
  });

  it("stimmt mit dem Brute-Force-Löser überein (alle Stufen, viele Ziele)", () => {
    for (const stage of STAGES) {
      const values = [...stage.values];
      for (const target of [24, 48, 72, 96, 120, 144]) {
        for (const count of [2, 3, 4, 5]) {
          expect(countWays(values, target, count)).toBe(
            bruteForceWays(values, target, count),
          );
        }
      }
    }
  });

  it("respektiert die Pausen-Vorgabe", () => {
    const values = ALL_VALUES;
    for (const target of [48, 96]) {
      for (const rests of [1, 2]) {
        expect(countWays(values, target, 4, rests)).toBe(
          bruteForceWays(values, target, 4, rests),
        );
      }
    }
  });
});

describe("createPuzzle", () => {
  const ITERATIONS = 120;

  it("erzeugt nur lösbare Aufgaben (exakte Symbolanzahl, alle Stufen)", () => {
    for (const stage of STAGES) {
      const values = [...stage.values];
      for (let i = 0; i < ITERATIONS; i++) {
        const p = createPuzzle(stage);
        expect(totalUnits(p.left)).toBe(p.targetUnits);
        expect(
          bruteForceWays(values, p.targetUnits, p.rightCount, p.requiredRests),
        ).toBeGreaterThan(0);
      }
    }
  });

  it("verwirft Kopier-Aufgaben: die linke Seite ist nie selbst eine gültige Lösung", () => {
    for (const stage of STAGES) {
      for (let i = 0; i < ITERATIONS; i++) {
        const p = createPuzzle(stage);
        expect(isTrivialCopy(p.left, p.rightCount, p.requiredRests)).toBe(
          false,
        );
        // Explizit: gleiche Anzahl + erfüllte Pausen-Vorgabe darf nicht vorkommen.
        const leftRests = p.left.filter((id) => NOTE_VALUES[id].isRest).length;
        const copyable =
          p.left.length === p.rightCount &&
          (p.requiredRests == null || leftRests === p.requiredRests);
        expect(copyable).toBe(false);
      }
    }
  });

  it("Pausen-Challenges haben eine Lösung mit exakt der geforderten Pausenzahl", () => {
    let checked = 0;
    for (let i = 0; i < 300 && checked < 30; i++) {
      const p = createPuzzle(ALLES);
      if (p.requiredRests == null) continue;
      checked += 1;
      expect(p.requiredRests).toBeGreaterThan(0);
      expect(p.requiredRests).toBeLessThan(p.rightCount);
      expect(
        bruteForceWays(
          ALL_VALUES,
          p.targetUnits,
          p.rightCount,
          p.requiredRests,
        ),
      ).toBeGreaterThan(0);
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("uniqueOnly-Aufgaben haben genau eine Lösung", () => {
    let checked = 0;
    for (let i = 0; i < 400 && checked < 15; i++) {
      const p = createPuzzle(ALLES);
      if (!p.uniqueOnly) continue;
      checked += 1;
      expect(
        countWays(ALL_VALUES, p.targetUnits, p.rightCount, p.requiredRests),
      ).toBe(1);
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("Perf-Smoke: 100 Fortgeschritten-Aufgaben deutlich unter einer Sekunde", () => {
    const t0 = Date.now();
    for (let i = 0; i < 100; i++) createPuzzle(ALLES);
    expect(Date.now() - t0).toBeLessThan(1000);
  });
});

describe("puzzleSignature", () => {
  it("ist unabhängig von der Reihenfolge der linken Seite", () => {
    const a = {
      targetUnits: 72,
      left: ["quarter", "half"] as NoteValueId[],
      rightCount: 3,
      uniqueOnly: false,
    };
    const b = { ...a, left: ["half", "quarter"] as NoteValueId[] };
    expect(puzzleSignature(a)).toBe(puzzleSignature(b));
  });

  it("unterscheidet Symbolanzahl und Challenge-Vorgaben", () => {
    const base = {
      targetUnits: 72,
      left: ["quarter", "half"] as NoteValueId[],
      rightCount: 3,
      uniqueOnly: false,
    };
    expect(puzzleSignature({ ...base, rightCount: 4 })).not.toBe(
      puzzleSignature(base),
    );
    expect(puzzleSignature({ ...base, requiredRests: 1 })).not.toBe(
      puzzleSignature(base),
    );
    expect(puzzleSignature({ ...base, uniqueOnly: true })).not.toBe(
      puzzleSignature(base),
    );
  });
});

describe("Stufen der Notenwaage", () => {
  it("lehrt nur, was stimmt: beide Seiten der Merkhilfe wiegen gleich", () => {
    for (const stage of STAGES) {
      if (!stage.lesson) continue;
      expect(totalUnits(stage.lesson.heavy)).toBe(
        totalUnits(stage.lesson.light),
      );
    }
  });

  it("bringt die neue Note in fast jede Aufgabe", () => {
    for (const stage of STAGES) {
      const { focus } = stage;
      if (!focus) continue;
      let used = 0;
      for (let i = 0; i < 60; i++) {
        const p = createPuzzle(stage);
        const without = stage.values.filter((v) => v !== focus);
        const needsFocus =
          countWays(
            [...without],
            p.targetUnits,
            p.rightCount,
            p.requiredRests,
          ) === 0;
        if (p.left.includes(focus) || needsFocus) used += 1;
      }
      expect(used).toBeGreaterThanOrEqual(55);
    }
  });

  it("Challenges prüfen alles bisher Gelernte mit passender Palette", () => {
    WAAGE_PATH.sections.forEach((section) => {
      const run = buildRun(WAAGE_PATH.challengeId(section.index));
      expect(run.steps).toHaveLength(10);
      expect(run.lesson).toBeNull();
      expect(run.liveScale).toBe(false);
      for (const stage of section.stages) {
        expect(run.steps).toContain(stage);
      }
      for (const step of run.steps) {
        for (const value of step.values) {
          expect(run.palette).toContain(value);
        }
      }
    });
  });

  it("zeigt die Waage nur im ersten Abschnitt ständig an", () => {
    const live = STAGES.filter((stage) => stage.liveScale);
    expect(live.every((s) => WAAGE_PATH.sections[0]!.stages.includes(s))).toBe(
      true,
    );
  });
});
