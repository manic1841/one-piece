/**
 * Reorder support for sortable lists that show a *subset* of their rows.
 *
 * A view filter (e.g. 顯示停用) hides rows, but the persisted `order` field
 * covers every row. The user drags what is visible, and `mergeReorderedIds`
 * re-seats those ids into the slots they already occupy, so the hidden rows
 * keep their position instead of the edit being dropped.
 */

/** Re-seat `orderedVisibleIds` into the slots `baseIds` already gives them. */
export const mergeReorderedIds = (
  baseIds: readonly string[],
  orderedVisibleIds: readonly string[],
): string[] => {
  const baseSet = new Set(baseIds);
  const order = orderedVisibleIds.filter((id) => baseSet.has(id));
  const visible = new Set(order);
  let cursor = 0;
  return baseIds.map((id) => (visible.has(id) ? order[cursor++] : id));
};
