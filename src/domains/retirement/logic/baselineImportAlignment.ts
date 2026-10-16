/**
 * Pure alignment for baseline imports (spec #301 §4.3).
 *
 * Import only introduces or updates rows — it never deletes and never
 * recalculates. Rows align to their source by a stable key
 * (`incomeCategory` / `ledgerCode` / `expenseCategory` / `sourceDebtAccountId`):
 * a match keeps the existing row id and takes only the overwrite fields (base
 * amount + source statistics); a missing source appends the imported row; and
 * existing sourced rows whose source is absent from the import are kept but
 * counted as unmatched so the caller can surface 「N 列未對應到來源」.
 */

export interface BaselineImportAlignment<TRow> {
  /** The next collection: existing rows preserved, matched rows updated, new rows appended. */
  rows: TRow[];
  addedCount: number;
  updatedCount: number;
  /** Existing sourced rows with no matching source in the import (source disappeared). */
  unmatchedCount: number;
  hasChanges: boolean;
}

const isEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const aKeys = Object.keys(aRecord);
  const bKeys = Object.keys(bRecord);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => isEqual(aRecord[key], bRecord[key]));
};

export function alignBaselineImport<TRow extends { id: string }>(params: {
  existing: TRow[];
  imported: TRow[];
  /** Extracts the row's source key; `undefined` means the row has no import source. */
  sourceKey: (row: TRow) => string | undefined;
  /** Fields taken from the imported row on alignment (user assumptions excluded). */
  applyImport: (existing: TRow, imported: TRow) => Partial<TRow>;
}): BaselineImportAlignment<TRow> {
  const { existing, imported, sourceKey, applyImport } = params;

  const rows = [...existing];
  const importedKeys = new Set<string>();
  let addedCount = 0;
  let updatedCount = 0;

  for (const incoming of imported) {
    const key = sourceKey(incoming);
    if (key === undefined) continue;
    importedKeys.add(key);

    const index = rows.findIndex((row) => sourceKey(row) === key);
    if (index < 0) {
      rows.push(incoming);
      addedCount += 1;
      continue;
    }

    const current = rows[index];
    const patch = applyImport(current, incoming);
    const changed = Object.entries(patch).some(
      ([field, value]) => !isEqual(value, (current as Record<string, unknown>)[field]),
    );
    if (changed) {
      rows[index] = { ...current, ...patch, id: current.id };
      updatedCount += 1;
    }
  }

  const unmatchedCount = existing.filter((row) => {
    const key = sourceKey(row);
    return key !== undefined && !importedKeys.has(key);
  }).length;

  return {
    rows,
    addedCount,
    updatedCount,
    unmatchedCount,
    hasChanges: addedCount > 0 || updatedCount > 0,
  };
}
