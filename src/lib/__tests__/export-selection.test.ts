import { describe, expect, it } from "@jest/globals";
import {
  MAX_EXPORT_SELECTION,
  buildExportFilename,
  findMissingIds,
  parseExportSelection,
} from "../export-selection";

describe("parseExportSelection", () => {
  it("exportiert ohne ids-Parameter weiterhin alles", () => {
    expect(parseExportSelection("events", [])).toEqual({ ok: true, ids: null });
    // Auch bei Typen ohne Einzelexport: der Gesamtexport bleibt unberührt.
    expect(parseExportSelection("media", [])).toEqual({ ok: true, ids: null });
  });

  it("liest kommagetrennte und wiederholte Parameter, ohne Dubletten", () => {
    expect(parseExportSelection("courses", [" a1 ,b2", "a1", "c3"])).toEqual({
      ok: true,
      ids: ["a1", "b2", "c3"],
    });
  });

  it("lässt auch ids zu, die keine UUID sind", () => {
    expect(parseExportSelection("events", ["zzz-test_termin-1"])).toEqual({
      ok: true,
      ids: ["zzz-test_termin-1"],
    });
  });

  it("lehnt einen leeren ids-Parameter ab, statt alles zu liefern", () => {
    expect(parseExportSelection("events", [""]).ok).toBe(false);
    expect(parseExportSelection("events", [" , ,"]).ok).toBe(false);
  });

  it("lehnt die Auswahl bei Typen ohne Einzelexport ab", () => {
    const result = parseExportSelection("media", ["a1"]);
    expect(result.ok).toBe(false);
  });

  it("lehnt ids mit Trennzeichen oder Sonderzeichen ab", () => {
    expect(parseExportSelection("posts", ["a1", "../etc"]).ok).toBe(false);
    expect(parseExportSelection("posts", ["a b"]).ok).toBe(false);
    expect(parseExportSelection("posts", ["x".repeat(101)]).ok).toBe(false);
  });

  it("begrenzt die Anzahl der Einträge", () => {
    const ids = Array.from(
      { length: MAX_EXPORT_SELECTION + 1 },
      (_, i) => `id${i}`,
    );
    expect(parseExportSelection("events", [ids.join(",")]).ok).toBe(false);
    expect(parseExportSelection("events", [ids.slice(1).join(",")]).ok).toBe(
      true,
    );
  });
});

describe("findMissingIds", () => {
  it("nennt die angefragten ids ohne Treffer in der angefragten Reihenfolge", () => {
    expect(findMissingIds(["a", "b", "c"], [{ id: "b" }, { id: "x" }])).toEqual(
      ["a", "c"],
    );
  });

  it("ist leer, wenn alles gefunden wurde", () => {
    expect(findMissingIds(["a"], [{ id: "a" }])).toEqual([]);
  });
});

describe("buildExportFilename", () => {
  it("behält den bisherigen Namen des Gesamtexports", () => {
    expect(buildExportFilename("events", "2026-09-17", null)).toBe(
      "events-export-2026-09-17.zip",
    );
  });

  it("benennt einen Einzelexport nach dem Slug", () => {
    expect(
      buildExportFilename("events", "2026-09-17", [
        { id: "1", slug: "sommerkonzert-2026", title: "Sommerkonzert" },
      ]),
    ).toBe("events-sommerkonzert-2026-export-2026-09-17.zip");
  });

  it("fällt ohne Slug auf den Titel zurück und hält den Namen ASCII", () => {
    expect(
      buildExportFilename("courses", "2026-09-17", [
        { id: "1", slug: null, title: "Lehrgang für Jungbläser*innen" },
      ]),
    ).toBe("courses-lehrgang-fuer-jungblaeser-innen-export-2026-09-17.zip");
  });

  it("lässt keine Anführungszeichen in den Header", () => {
    const name = buildExportFilename("posts", "2026-09-17", [
      { id: "1", slug: 'x"; filename="evil', title: null },
    ]);
    expect(name).not.toMatch(/["; ]/);
  });

  it("fällt bei unbrauchbarem Titel auf die id zurück", () => {
    expect(
      buildExportFilename("posts", "2026-09-17", [
        { id: "abc-123", slug: null, title: "!!!" },
      ]),
    ).toBe("posts-abc-123-export-2026-09-17.zip");
  });

  it("zählt bei mehreren Einträgen nur die Auswahl", () => {
    expect(
      buildExportFilename("events", "2026-09-17", [{ id: "1" }, { id: "2" }]),
    ).toBe("events-auswahl-2-export-2026-09-17.zip");
  });
});
