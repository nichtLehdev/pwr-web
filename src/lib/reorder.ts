/**
 * Helpers for reordering list items via their numeric sort field.
 */

export interface ReorderableItem {
  id: string;
  sortOrder: number;
}

export interface ReorderUpdate {
  id: string;
  sortOrder: number;
}

/**
 * Computes the sortOrder updates needed to move the item at `index` one
 * position up or down within `items` (which must be in display order).
 *
 * If the list is strictly ordered by sortOrder (no duplicates), only the two
 * affected items are swapped. Otherwise (duplicate or unordered sort values)
 * the whole list is reassigned sequential values so subsequent moves are
 * stable.
 *
 * Returns `null` when the move is not possible (out of bounds).
 */
export function computeReorderUpdates(
  items: readonly ReorderableItem[],
  index: number,
  direction: "up" | "down",
): ReorderUpdate[] | null {
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || index >= items.length) return null;
  if (targetIndex < 0 || targetIndex >= items.length) return null;

  const current = items[index];
  const neighbor = items[targetIndex];
  if (!current || !neighbor) return null;

  const isStrictlyOrdered = items.every((item, i) => {
    if (i === 0) return true;
    const prev = items[i - 1];
    return prev !== undefined && prev.sortOrder < item.sortOrder;
  });

  if (isStrictlyOrdered) {
    return [
      { id: current.id, sortOrder: neighbor.sortOrder },
      { id: neighbor.id, sortOrder: current.sortOrder },
    ];
  }

  // Fallback: duplicate or unordered sort values – reassign sequential
  // values for the whole list with the requested swap applied.
  const reordered = [...items];
  reordered[index] = neighbor;
  reordered[targetIndex] = current;
  return reordered.map((item, i) => ({ id: item.id, sortOrder: i }));
}
