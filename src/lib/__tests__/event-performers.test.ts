import { describe, expect, it } from "@jest/globals";
import {
  firstPerformerImage,
  joinPerformerNames,
  linkedEnsembleIds,
  normalizePerformers,
  performerNames,
} from "../event-performers";

describe("normalizePerformers", () => {
  it("keeps only the target that matches the type", () => {
    expect(
      normalizePerformers([
        { type: "ENSEMBLE", ensembleId: "e1", auswahlChorId: "a1", name: "x" },
        { type: "AUSWAHLCHOR", ensembleId: "e2", auswahlChorId: "a1" },
        { type: "CUSTOM", ensembleId: "e3", name: "  Gastchor  " },
      ]),
    ).toEqual([
      { type: "ENSEMBLE", ensembleId: "e1" },
      { type: "AUSWAHLCHOR", auswahlChorId: "a1" },
      { type: "CUSTOM", name: "Gastchor" },
    ]);
  });

  // The form sends every row, including the half-filled ones.
  it("drops rows without a target or name", () => {
    expect(
      normalizePerformers([
        { type: "ENSEMBLE", ensembleId: null },
        { type: "AUSWAHLCHOR", auswahlChorId: "" },
        { type: "CUSTOM", name: "   " },
      ]),
    ).toEqual([]);
  });

  it("drops duplicates and keeps the first position", () => {
    expect(
      normalizePerformers([
        { type: "ENSEMBLE", ensembleId: "e1" },
        { type: "CUSTOM", name: "Gastchor" },
        { type: "ENSEMBLE", ensembleId: "e1" },
        { type: "CUSTOM", name: "gastchor" },
      ]),
    ).toEqual([
      { type: "ENSEMBLE", ensembleId: "e1" },
      { type: "CUSTOM", name: "Gastchor" },
    ]);
  });
});

describe("linkedEnsembleIds", () => {
  it("lists each linked ensemble once", () => {
    expect(
      linkedEnsembleIds([
        { ensembleId: "e1" },
        { ensembleId: null },
        { ensembleId: "e1" },
        { ensembleId: "e2" },
        {},
      ]),
    ).toEqual(["e1", "e2"]);
  });
});

describe("joinPerformerNames", () => {
  it("joins names the German way", () => {
    expect(joinPerformerNames([])).toBe("");
    expect(joinPerformerNames(["A"])).toBe("A");
    expect(joinPerformerNames(["A", "B"])).toBe("A & B");
    expect(joinPerformerNames(["A", "B", "C"])).toBe("A, B und C");
  });

  it("skips empty names", () => {
    expect(joinPerformerNames(["A", " ", "B"])).toBe("A & B");
  });
});

describe("performerNames", () => {
  it("prefers the linked target's current name over the stored one", () => {
    expect(
      performerNames([
        { name: "Alter Name", ensemble: { name: "Posaunenchor Neu" } },
        { name: "Gastchor" },
      ]),
    ).toBe("Posaunenchor Neu & Gastchor");
  });

  // The link was removed (ensemble deleted): the stored name still reads.
  it("falls back to the stored name", () => {
    expect(performerNames([{ name: "Posaunenchor Alt", ensemble: null }])).toBe(
      "Posaunenchor Alt",
    );
  });

  it("is empty without performers", () => {
    expect(performerNames(undefined)).toBe("");
  });
});

describe("firstPerformerImage", () => {
  it("takes the first linked image", () => {
    const image = { url: "/a.jpg" };
    expect(
      firstPerformerImage([
        { ensemble: { image: null } },
        { auswahlChor: { image } },
      ]),
    ).toBe(image);
    expect(firstPerformerImage([])).toBeNull();
  });
});
