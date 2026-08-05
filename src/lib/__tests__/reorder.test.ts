import { describe, expect, it } from "@jest/globals";
import { computeReorderUpdates } from "../reorder";

describe("computeReorderUpdates", () => {
  const ordered = [
    { id: "a", sortOrder: 1 },
    { id: "b", sortOrder: 2 },
    { id: "c", sortOrder: 5 },
  ];

  it("swaps sortOrder with the previous item when moving up", () => {
    expect(computeReorderUpdates(ordered, 1, "up")).toEqual([
      { id: "b", sortOrder: 1 },
      { id: "a", sortOrder: 2 },
    ]);
  });

  it("swaps sortOrder with the next item when moving down", () => {
    expect(computeReorderUpdates(ordered, 1, "down")).toEqual([
      { id: "b", sortOrder: 5 },
      { id: "c", sortOrder: 2 },
    ]);
  });

  it("returns null when moving the first item up", () => {
    expect(computeReorderUpdates(ordered, 0, "up")).toBeNull();
  });

  it("returns null when moving the last item down", () => {
    expect(computeReorderUpdates(ordered, 2, "down")).toBeNull();
  });

  it("returns null for out-of-bounds indices", () => {
    expect(computeReorderUpdates(ordered, -1, "down")).toBeNull();
    expect(computeReorderUpdates(ordered, 3, "up")).toBeNull();
    expect(computeReorderUpdates([], 0, "down")).toBeNull();
  });

  it("reassigns sequential values when sort values are duplicated", () => {
    const duplicated = [
      { id: "a", sortOrder: 0 },
      { id: "b", sortOrder: 0 },
      { id: "c", sortOrder: 0 },
    ];
    expect(computeReorderUpdates(duplicated, 2, "up")).toEqual([
      { id: "a", sortOrder: 0 },
      { id: "c", sortOrder: 1 },
      { id: "b", sortOrder: 2 },
    ]);
  });

  it("reassigns sequential values when the list is not sorted by sortOrder", () => {
    const unsorted = [
      { id: "a", sortOrder: 3 },
      { id: "b", sortOrder: 1 },
      { id: "c", sortOrder: 2 },
    ];
    expect(computeReorderUpdates(unsorted, 0, "down")).toEqual([
      { id: "b", sortOrder: 0 },
      { id: "a", sortOrder: 1 },
      { id: "c", sortOrder: 2 },
    ]);
  });
});
