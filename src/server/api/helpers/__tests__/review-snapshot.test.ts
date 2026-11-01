import { describe, expect, it } from "@jest/globals";
import { diffReviewFields } from "../review-snapshot";

describe("diffReviewFields", () => {
  it("returns nothing when nothing changed", () => {
    const fields = {
      title: "Bläsertag",
      priceOptions: ["Erwachsene: 10,00 €"],
    };
    expect(diffReviewFields("event", fields, { ...fields })).toEqual([]);
  });

  it("lists only changed fields, labelled and in form order", () => {
    const before = { content: "Alt", title: "Titel", excerpt: null };
    const after = { content: "Neu", title: "Neuer Titel", excerpt: null };
    expect(diffReviewFields("post", before, after)).toEqual([
      { key: "title", label: "Titel", before: "Titel", after: "Neuer Titel" },
      { key: "content", label: "Inhalt", before: "Alt", after: "Neu" },
    ]);
  });

  it("compares lists item by item", () => {
    const changes = diffReviewFields(
      "course",
      { customFields: ["Instrument", "Alter"] },
      { customFields: ["Alter", "Instrument"] },
    );
    expect(changes.map((c) => c.key)).toEqual(["customFields"]);
  });

  // A column added after the snapshot was taken must still surface.
  it("shows unknown fields under their key", () => {
    expect(diffReviewFields("post", {}, { someNewColumn: "Wert" })).toEqual([
      {
        key: "someNewColumn",
        label: "someNewColumn",
        before: null,
        after: "Wert",
      },
    ]);
  });

  it("treats a missing field like an empty one", () => {
    expect(diffReviewFields("post", {}, { excerpt: null })).toEqual([]);
  });
});
