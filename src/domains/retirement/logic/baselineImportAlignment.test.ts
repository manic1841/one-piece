import { describe, expect, it } from 'vitest';

import { alignBaselineImport } from './baselineImportAlignment';

interface Row {
  id: string;
  source?: string;
  amount: number;
  growthRate?: number;
}

const sourceKey = (row: Row): string | undefined => row.source;

/** Import only owns the base amount; user assumptions stay untouched. */
const applyImport = (_existing: Row, imported: Row): Partial<Row> => ({ amount: imported.amount });

const row = (id: string, source: string | undefined, amount: number, growthRate?: number): Row => ({
  id,
  source,
  amount,
  ...(growthRate === undefined ? {} : { growthRate }),
});

describe('alignBaselineImport', () => {
  it('appends rows whose source is not present yet', () => {
    const result = alignBaselineImport({
      existing: [row('e1', 'a', 100)],
      imported: [row('i2', 'b', 200)],
      sourceKey,
      applyImport,
    });

    expect(result.rows.map((r) => r.id)).toEqual(['e1', 'i2']);
    expect(result.addedCount).toBe(1);
    expect(result.hasChanges).toBe(true);
  });

  it('updates a matched row in place, keeping its id and touching only the overwrite fields', () => {
    const result = alignBaselineImport({
      existing: [row('e1', 'a', 100, 3)],
      imported: [row('i2', 'a', 150, 9)],
      sourceKey,
      applyImport,
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({ id: 'e1', source: 'a', amount: 150, growthRate: 3 });
    expect(result.updatedCount).toBe(1);
    expect(result.hasChanges).toBe(true);
  });

  it('does not report changes when nothing differs', () => {
    const result = alignBaselineImport({
      existing: [row('e1', 'a', 100, 3)],
      imported: [row('i2', 'a', 100)],
      sourceKey,
      applyImport,
    });

    expect(result.rows[0]).toEqual({ id: 'e1', source: 'a', amount: 100, growthRate: 3 });
    expect(result.updatedCount).toBe(0);
    expect(result.hasChanges).toBe(false);
  });

  it('keeps rows whose source no longer exists and counts them as unmatched', () => {
    const result = alignBaselineImport({
      existing: [row('e1', 'a', 100), row('e2', 'gone', 200)],
      imported: [row('i1', 'a', 100)],
      sourceKey,
      applyImport,
    });

    expect(result.rows.map((r) => r.id)).toEqual(['e1', 'e2']);
    expect(result.unmatchedCount).toBe(1);
    expect(result.hasChanges).toBe(false);
  });

  it('ignores imported rows without a source key (they cannot be aligned)', () => {
    const result = alignBaselineImport({
      existing: [],
      imported: [row('i1', undefined, 100)],
      sourceKey,
      applyImport,
    });

    expect(result.rows).toHaveLength(0);
    expect(result.addedCount).toBe(0);
    expect(result.hasChanges).toBe(false);
  });

  it('does not count a legacy row without a source key as unmatched', () => {
    const result = alignBaselineImport({
      existing: [row('legacy', undefined, 100), row('e1', 'a', 50)],
      imported: [row('i1', 'a', 50)],
      sourceKey,
      applyImport,
    });

    expect(result.unmatchedCount).toBe(0);
  });

  it('treats an empty import as matching nothing, so every sourced row is unmatched', () => {
    const result = alignBaselineImport({
      existing: [row('e1', 'a', 100), row('legacy', undefined, 5)],
      imported: [],
      sourceKey,
      applyImport,
    });

    expect(result.rows.map((r) => r.id)).toEqual(['e1', 'legacy']);
    expect(result.unmatchedCount).toBe(1);
    expect(result.hasChanges).toBe(false);
  });
});
