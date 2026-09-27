/**
 * Seam tests for the linked-year resolver used by migrate-retirement-v1
 * (issue #132).
 *
 * The resolver is the pre-agreed seam: it turns income docs with
 * startYearMode/endYearMode = LINKED_TO_RETIREMENT into concrete year patches
 * without touching Firestore. Expected values are independent worked examples
 * mirroring the app engine's resolveIncomeWindow / filterActiveIncomes.
 */
import { describe, expect, it } from 'vitest';

import {
  type LinkableIncomeDoc,
  resolveLinkedIncomeYears,
} from '../../scripts/admin/retirement-linked-years';

const salary = (overrides: Partial<LinkableIncomeDoc> = {}): LinkableIncomeDoc => ({
  id: 'inc-salary',
  type: 'salary',
  startYear: 2024,
  startYearMode: 'MANUAL',
  endYearMode: 'MANUAL',
  lifelong: false,
  endYear: 2045,
  ...overrides,
});

describe('resolveLinkedIncomeYears', () => {
  it('returns empty patches and zero resolved when no stream is linked', () => {
    const result = resolveLinkedIncomeYears(
      [
        salary({ id: 'a', endYearMode: 'MANUAL', endYear: 2045 }),
        salary({ id: 'b', startYearMode: 'MANUAL' }),
      ],
      2040,
    );

    expect(result.patches).toEqual([]);
    expect(result.resolvedCount).toBe(0);
  });

  it('writes retirement year into startYear for a linked start (pension)', () => {
    const result = resolveLinkedIncomeYears(
      [salary({ id: 'pension', type: 'pension', startYearMode: 'LINKED_TO_RETIREMENT' })],
      2040,
    );

    expect(result.patches).toEqual([{ id: 'pension', startYear: 2040 }]);
    expect(result.resolvedCount).toBe(1);
  });

  it('writes retirement year into endYear for a linked non-lifelong end', () => {
    const result = resolveLinkedIncomeYears(
      [
        salary({
          id: 'bonus',
          type: 'bonus',
          endYearMode: 'LINKED_TO_RETIREMENT',
          endYear: undefined,
        }),
      ],
      2040,
    );

    expect(result.patches).toEqual([{ id: 'bonus', endYear: 2040 }]);
    expect(result.resolvedCount).toBe(1);
  });

  it('resolves both modes on the same stream into one patch', () => {
    const result = resolveLinkedIncomeYears(
      [
        salary({
          id: 'both',
          startYearMode: 'LINKED_TO_RETIREMENT',
          endYearMode: 'LINKED_TO_RETIREMENT',
          endYear: undefined,
        }),
      ],
      2040,
    );

    expect(result.patches).toEqual([{ id: 'both', startYear: 2040, endYear: 2040 }]);
    expect(result.resolvedCount).toBe(1);
  });

  it('leaves a lifelong linked-end stream unchanged (end year stays unbounded)', () => {
    const result = resolveLinkedIncomeYears(
      [
        salary({
          id: 'lifelong-salary',
          type: 'salary',
          endYearMode: 'LINKED_TO_RETIREMENT',
          lifelong: true,
          endYear: undefined,
        }),
      ],
      2040,
    );

    expect(result.patches).toEqual([]);
    expect(result.resolvedCount).toBe(0);
  });

  it('resolves a linked start on a lifelong pension stream', () => {
    const result = resolveLinkedIncomeYears(
      [
        salary({
          id: 'lifelong-pension',
          type: 'pension',
          startYearMode: 'LINKED_TO_RETIREMENT',
          lifelong: true,
          endYear: undefined,
        }),
      ],
      2040,
    );

    expect(result.patches).toEqual([{ id: 'lifelong-pension', startYear: 2040 }]);
    expect(result.resolvedCount).toBe(1);
  });

  it('counts only resolved streams in the report', () => {
    const result = resolveLinkedIncomeYears(
      [
        salary({ id: 'a', endYearMode: 'LINKED_TO_RETIREMENT', endYear: undefined }),
        salary({ id: 'b', type: 'pension', startYearMode: 'LINKED_TO_RETIREMENT' }),
        salary({ id: 'c', startYearMode: 'MANUAL' }),
      ],
      2040,
    );

    expect(result.patches).toEqual([
      { id: 'a', endYear: 2040 },
      { id: 'b', startYear: 2040 },
    ]);
    expect(result.resolvedCount).toBe(2);
  });
});
