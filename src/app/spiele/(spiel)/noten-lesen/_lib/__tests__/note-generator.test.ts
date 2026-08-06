import { describe, expect, test } from "@jest/globals";
import {
  answerLayoutForPitches,
  buildAnswerLabels,
  buildAnswerLabelsForLayout,
  pickPitchFromPool,
  pickRandomPitch,
  recordCorrect,
  recordMiss,
  type MissTracker,
} from "../note-generator";
import { answerLabelForPitch, writtenPitchToMidi } from "../pitch";
import { pitchKey, pitchPool } from "../ranges";
import type { WrittenPitch } from "../types";

/** Deterministischer LCG für reproduzierbare Verteilungstests. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe("pickRandomPitch — MIDI-gleichverteilte Schreibweisenwahl", () => {
  test("Vorzeichen-Anteil entspricht dem Anteil schwarzer Tasten (nicht ~59 %)", () => {
    const pool = pitchPool("trumpet_c", "advanced");
    const midis = new Set(pool.map(writtenPitchToMidi));
    const blackMidis = [...midis].filter((m) =>
      [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12),
    );
    const expected = blackMidis.length / midis.size; // ≈ 5/12

    const rng = lcg(42);
    const n = 20000;
    let withAccidental = 0;
    for (let i = 0; i < n; i++) {
      const p = pickRandomPitch("trumpet_c", "advanced", null, { rng });
      if (p.alter !== 0) withAccidental++;
    }
    const fraction = withAccidental / n;
    expect(fraction).toBeGreaterThan(expected - 0.03);
    expect(fraction).toBeLessThan(expected + 0.03);
    // Alte, fehlerhafte Verteilung lag bei ~0.59:
    expect(fraction).toBeLessThan(0.5);
  });

  test("beide Schreibweisen einer schwarzen Taste kommen vor", () => {
    const rng = lcg(7);
    const seen = new Set<string>();
    for (let i = 0; i < 5000; i++) {
      const p = pickRandomPitch("trumpet_c", "advanced", null, { rng });
      if (((writtenPitchToMidi(p) % 12) + 12) % 12 === 6) {
        seen.add(answerLabelForPitch(p));
      }
    }
    expect(seen).toContain("Fis");
    expect(seen).toContain("Ges");
  });
});

describe("pickRandomPitch — Fehlergewichtung", () => {
  test("verfehlte Töne werden ~3× so oft gezogen", () => {
    const pool = pitchPool("trumpet_c", "beginner");
    const missedPitch = pool.find((p) => p.letter === "C" && p.octave === 5)!;
    expect(missedPitch).toBeDefined();

    const missCounts: MissTracker = new Map();
    recordMiss(missCounts, pitchKey(missedPitch));

    const rng = lcg(1234);
    const n = 20000;
    let hits = 0;
    for (let i = 0; i < n; i++) {
      const p = pickRandomPitch("trumpet_c", "beginner", null, {
        rng,
        missCounts,
      });
      if (pitchKey(p) === pitchKey(missedPitch)) hits++;
    }
    // Pool: 10 Naturtöne, einer 3× gewichtet → erwartet 3/12 = 0.25.
    const fraction = hits / n;
    expect(fraction).toBeGreaterThan(0.2);
    expect(fraction).toBeLessThan(0.3);
  });

  test("ohne Gewichtung bleibt die Ziehung gleichverteilt", () => {
    const rng = lcg(99);
    const n = 20000;
    let hits = 0;
    const target: WrittenPitch = { letter: "C", octave: 5, alter: 0 };
    for (let i = 0; i < n; i++) {
      const p = pickRandomPitch("trumpet_c", "beginner", null, { rng });
      if (pitchKey(p) === pitchKey(target)) hits++;
    }
    // 10 Naturtöne → erwartet 0.1.
    expect(hits / n).toBeGreaterThan(0.07);
    expect(hits / n).toBeLessThan(0.13);
  });

  test("MissTracker: nach zwei richtigen Antworten wieder neutral", () => {
    const tracker: MissTracker = new Map();
    recordMiss(tracker, "C50");
    expect(tracker.get("C50")).toBe(2);
    recordCorrect(tracker, "C50");
    expect(tracker.get("C50")).toBe(1);
    recordCorrect(tracker, "C50");
    expect(tracker.has("C50")).toBe(false);
    // Unbekannter Key bleibt ein No-op:
    recordCorrect(tracker, "D50");
    expect(tracker.size).toBe(0);
  });
});

describe("pickRandomPitch — Wiederholungs-Schutz", () => {
  test("avoidMidi wird nie direkt wiederholt", () => {
    const rng = lcg(5);
    const avoid = writtenPitchToMidi({ letter: "G", octave: 4, alter: 0 });
    for (let i = 0; i < 1000; i++) {
      const p = pickRandomPitch("trumpet_c", "beginner", avoid, { rng });
      expect(writtenPitchToMidi(p)).not.toBe(avoid);
    }
  });

  test("Experte: geklemmter Pool des zuerst gezogenen Schlüssels", () => {
    const rng = lcg(11);
    for (let i = 0; i < 500; i++) {
      const t = pickRandomPitch("trumpet_c", "expert", null, {
        rng,
        clef: "treble",
      });
      const b = pickRandomPitch("trumpet_c", "expert", null, {
        rng,
        clef: "bass",
      });
      const tm = writtenPitchToMidi(t);
      const bm = writtenPitchToMidi(b);
      expect(tm).toBeGreaterThanOrEqual(50);
      expect(tm).toBeLessThanOrEqual(86);
      expect(bm).toBeGreaterThanOrEqual(34);
      expect(bm).toBeLessThanOrEqual(71);
    }
  });
});

describe("buildAnswerLabels — feste Layouts", () => {
  test("diatonisch: immer C D E F G A H in fester Reihenfolge", () => {
    const target: WrittenPitch = { letter: "G", octave: 4, alter: 0 };
    expect(buildAnswerLabels(target, "beginner")).toEqual([
      "C",
      "D",
      "E",
      "F",
      "G",
      "A",
      "H",
    ]);
  });

  test("chromatisch: 12 Tonklassen, Zielton trägt seine Schreibweise", () => {
    const dis: WrittenPitch = { letter: "D", octave: 4, alter: 1 };
    const labels = buildAnswerLabels(dis, "advanced");
    expect(labels).toHaveLength(12);
    expect(labels[3]).toBe("Dis"); // statt Standard „Es“
    expect(labels[0]).toBe("C");
    expect(labels[11]).toBe("H");

    const es: WrittenPitch = { letter: "E", octave: 4, alter: -1 };
    expect(buildAnswerLabels(es, "advanced")[3]).toBe("Es");
    // Richtige Antwort ist immer enthalten:
    expect(buildAnswerLabels(dis, "advanced")).toContain(
      answerLabelForPitch(dis),
    );
  });
});

describe("pickPitchFromPool — eigenes Notenset als Pool", () => {
  const pool: WrittenPitch[] = [
    { letter: "C", octave: 4, alter: 0 },
    { letter: "E", octave: 4, alter: 0 },
    { letter: "G", octave: 4, alter: 0 },
  ];

  test("zieht nur Töne aus dem Pool und wiederholt avoidMidi nie", () => {
    const rng = lcg(3);
    const keys = new Set(pool.map(pitchKey));
    const avoid = writtenPitchToMidi(pool[1]!);
    for (let i = 0; i < 500; i++) {
      const p = pickPitchFromPool(pool, avoid, { rng });
      expect(keys.has(pitchKey(p))).toBe(true);
      expect(writtenPitchToMidi(p)).not.toBe(avoid);
    }
  });

  test("2er-Set aus enharmonischen Schreibweisen: avoidMidi blockiert nicht", () => {
    const enharm: WrittenPitch[] = [
      { letter: "C", octave: 4, alter: 1 },
      { letter: "D", octave: 4, alter: -1 },
    ];
    const rng = lcg(8);
    const avoid = writtenPitchToMidi(enharm[0]!);
    // Beide Töne teilen den MIDI-Wert → Fallback auf den vollen Pool.
    const p = pickPitchFromPool(enharm, avoid, { rng });
    expect(writtenPitchToMidi(p)).toBe(avoid);
  });

  test("Fehlergewichtung wirkt auch im eigenen Pool", () => {
    const missCounts: MissTracker = new Map();
    recordMiss(missCounts, pitchKey(pool[0]!));
    const rng = lcg(21);
    const n = 20000;
    let hits = 0;
    for (let i = 0; i < n; i++) {
      const p = pickPitchFromPool(pool, null, { rng, missCounts });
      if (pitchKey(p) === pitchKey(pool[0]!)) hits++;
    }
    // 3 Töne, einer 3× gewichtet → erwartet 3/5 = 0.6.
    expect(hits / n).toBeGreaterThan(0.55);
    expect(hits / n).toBeLessThan(0.65);
  });
});

describe("answerLayoutForPitches / buildAnswerLabelsForLayout", () => {
  test("nur Naturtöne → diatonisches 7er-Raster", () => {
    const naturals: WrittenPitch[] = [
      { letter: "C", octave: 4, alter: 0 },
      { letter: "D", octave: 4, alter: 0 },
    ];
    expect(answerLayoutForPitches(naturals)).toBe("diatonic");
    expect(
      buildAnswerLabelsForLayout(
        { letter: "D", octave: 4, alter: 0 },
        "diatonic",
      ),
    ).toEqual(["C", "D", "E", "F", "G", "A", "H"]);
  });

  test("ein Vorzeichen im Set → chromatisches 12er-Raster mit Ziel-Schreibweise", () => {
    const withAccidental: WrittenPitch[] = [
      { letter: "C", octave: 4, alter: 0 },
      { letter: "D", octave: 4, alter: 1 },
    ];
    expect(answerLayoutForPitches(withAccidental)).toBe("chromatic");
    const labels = buildAnswerLabelsForLayout(
      { letter: "D", octave: 4, alter: 1 },
      "chromatic",
    );
    expect(labels).toHaveLength(12);
    expect(labels[3]).toBe("Dis");
    expect(labels[0]).toBe("C");
    expect(labels[11]).toBe("H");
  });
});
