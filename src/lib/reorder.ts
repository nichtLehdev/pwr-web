export interface ReorderableItem {
  id: string;
  sortOrder: number;
}

export interface ReorderUpdate {
  id: string;
  sortOrder: number;
}

/**
 * `items` must be in display order. Swaps two sortOrders if strictly ordered, otherwise
 * renumbers the whole list so later moves are stable. `null` when out of bounds.
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

  const reordered = [...items];
  reordered[index] = neighbor;
  reordered[targetIndex] = current;
  return reordered.map((item, i) => ({ id: item.id, sortOrder: i }));
}
