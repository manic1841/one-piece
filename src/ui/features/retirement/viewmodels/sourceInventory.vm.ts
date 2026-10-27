/**
 * Source inventory for the workspace rail.
 *
 * The difference between the draft's rule sources and the household's own
 * ledger codes. Unassigned sources are information, never an error.
 */

export type InventorySourceType = 'income' | 'expense' | 'debt';

export interface InventoryRule {
  sourceType: string;
  sourceId: string;
}

export interface InventorySource {
  id: string;
  label: string;
  type: InventorySourceType;
}

export interface SourceInventory {
  usedCount: number;
  unassigned: InventorySource[];
}

const SOURCE_TYPES = new Set(['ledgerCode', 'debtAccount']);

/** Ledger codes and debt accounts are both subjects; rule sources are not. */
export const buildSourceInventory = (
  rules: readonly InventoryRule[],
  sources: readonly InventorySource[],
): SourceInventory => {
  const used = new Set(
    rules
      .filter((rule) => SOURCE_TYPES.has(rule.sourceType) && rule.sourceId !== '')
      .map((rule) => rule.sourceId),
  );
  return {
    usedCount: used.size,
    unassigned: sources
      .filter((source) => !used.has(source.id))
      .sort((left, right) => left.label.localeCompare(right.label)),
  };
};
