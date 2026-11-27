import { describe, expect, it } from 'vitest';

import type { AmountItem, ProjectionInput } from '../projectionTypes';
import { ENGINE_VERSION, calculateProjection } from './projectionEngine';

function item(amount: number, sourceRef = 's'): AmountItem {
  return { sourceRef, label: sourceRef, origin: 'rule', amount };
}

function input(overrides: Partial<ProjectionInput> = {}): ProjectionInput {
  return {
    firstYear: 2025,
    lastYear: 2027,
    retirementYear: 2026,
    birthYear: 1960,
    openingNetWorth: 1000,
    annualReturnRate: 0.1,
    years: [
      { year: 2025, inflows: [], outflows: [] },
      { year: 2026, inflows: [], outflows: [] },
      { year: 2027, inflows: [], outflows: [] },
    ],
    ...overrides,
  };
}

describe('calculateProjection', () => {
  it('exports a version', () => {
    expect(ENGINE_VERSION).toBe(3);
  });

  it('applies the return to the opening balance', () => {
    const result = calculateProjection(
      input({
        years: [{ year: 2025, inflows: [], outflows: [] }],
        firstYear: 2025,
        lastYear: 2025,
      }),
    );

    expect(result.years[0].return).toBe(100);
    expect(result.years[0].closing).toBe(1100);
  });

  it('computes closing as opening + inflows - outflows + return', () => {
    const result = calculateProjection(
      input({
        years: [{ year: 2025, inflows: [item(50)], outflows: [item(30)] }],
        firstYear: 2025,
        lastYear: 2025,
      }),
    );

    expect(result.years[0].inflows).toBe(50);
    expect(result.years[0].outflows).toBe(30);
    expect(result.years[0].closing).toBe(1120);
  });

  it('keeps the inflow and outflow lines behind the totals', () => {
    const result = calculateProjection(
      input({
        years: [
          {
            year: 2025,
            inflows: [item(50, 'salary'), item(25, 'bonus')],
            outflows: [item(30, 'rent')],
          },
        ],
        firstYear: 2025,
        lastYear: 2025,
      }),
    );

    expect(result.years[0].inflowItems).toEqual([
      { sourceRef: 'salary', origin: 'rule', amount: 50 },
      { sourceRef: 'bonus', origin: 'rule', amount: 25 },
    ]);
    expect(result.years[0].outflowItems).toEqual([
      { sourceRef: 'rent', origin: 'rule', amount: 30 },
    ]);
  });

  it('drops zero lines so a disabled source never shows and totals equal the lines', () => {
    const result = calculateProjection(
      input({
        years: [
          {
            year: 2025,
            inflows: [item(0, 'salary'), item(0.4, 'tiny')],
            outflows: [item(10.6, 'rent')],
          },
        ],
        firstYear: 2025,
        lastYear: 2025,
      }),
    );

    expect(result.years[0].inflowItems).toEqual([]);
    expect(result.years[0].inflows).toBe(0);
    expect(result.years[0].outflowItems).toEqual([
      { sourceRef: 'rent', origin: 'rule', amount: 11 },
    ]);
    expect(result.years[0].outflows).toBe(11);
  });

  it('rounds only at output while compounding unrounded internally', () => {
    const result = calculateProjection(
      input({
        annualReturnRate: 0.005,
        openingNetWorth: 100,
        years: [
          { year: 2025, inflows: [], outflows: [] },
          { year: 2026, inflows: [], outflows: [] },
        ],
        firstYear: 2025,
        lastYear: 2026,
      }),
    );

    expect(result.years[0].return).toBe(1); // 0.5 rounds to 1
    expect(result.years[0].closing).toBe(101); // 100.5 rounds to 101
    expect(result.years[1].opening).toBe(101); // output rounding
    expect(result.years[1].return).toBe(1); // 100.5 * 0.005 = 0.5025 rounds to 1
    expect(result.years[1].closing).toBe(101); // 101.0025 rounds to 101
  });

  it('keeps calculating through bankruptcy and compounds negative balances', () => {
    const result = calculateProjection(
      input({
        openingNetWorth: 100,
        annualReturnRate: 0.1,
        years: [
          { year: 2025, inflows: [], outflows: [item(150)] },
          { year: 2026, inflows: [], outflows: [] },
          { year: 2027, inflows: [], outflows: [] },
        ],
      }),
    );

    expect(result.years[0].closing).toBe(-40);
    expect(result.years[1].opening).toBe(-40);
    expect(result.years[1].return).toBe(-4);
    expect(result.years[1].closing).toBe(-44);
    expect(result.years[2].closing).toBe(-48);
    expect(result.summary.bankruptcyYear).toBe(2025);
    expect(result.summary.isBankrupt).toBe(true);
  });

  it('returns null for retirement net worth after the range', () => {
    const result = calculateProjection(input({ retirementYear: 2099 }));

    expect(result.years[0].isRetired).toBe(false);
    expect(result.summary.retirementNetWorth).toBeNull();
  });

  it('returns null sentinels for an empty input', () => {
    const result = calculateProjection(input({ years: [] }));

    expect(result.years).toEqual([]);
    expect(result.summary.minNetWorthYear).toBeNull();
    expect(result.summary.bankruptcyYear).toBeNull();
    expect(result.summary.isBankrupt).toBe(false);
    expect(result.summary.minNetWorth).toBe(1000);
    expect(result.summary.finalNetWorth).toBe(1000);
  });

  it('uses the first opening when retirement precedes the range', () => {
    const result = calculateProjection(input({ retirementYear: 2000 }));

    expect(result.summary.retirementNetWorth).toBe(1000);
  });

  it('uses the retirement year opening when retirement is inside the range', () => {
    const result = calculateProjection(input({ retirementYear: 2026 }));

    expect(result.summary.retirementNetWorth).toBe(1100);
  });

  it('derives age and isRetired per year', () => {
    const result = calculateProjection(input());

    expect(result.years.map((year) => year.age)).toEqual([65, 66, 67]);
    expect(result.years.map((year) => year.isRetired)).toEqual([false, true, true]);
  });

  it('scans every year for the minimum net worth', () => {
    const result = calculateProjection(
      input({
        years: [
          { year: 2025, inflows: [], outflows: [item(500)] },
          { year: 2026, inflows: [item(1000)], outflows: [] },
          { year: 2027, inflows: [item(5000)], outflows: [] },
        ],
      }),
    );

    // Year-start basis: the low point is the 2026 opening (2025's closing), not 2025's own closing.
    expect(result.summary.minNetWorth).toBe(600);
    expect(result.summary.minNetWorthYear).toBe(2026);
  });

  it('takes the minimum from the years even when never below the opening', () => {
    const result = calculateProjection(input());

    expect(result.summary.minNetWorth).toBe(1000);
    expect(result.summary.minNetWorthYear).toBe(2025);
  });

  it('reports the final net worth and null bankruptcy when never negative', () => {
    const result = calculateProjection(input());

    expect(result.summary.finalNetWorth).toBe(1331);
    expect(result.summary.bankruptcyYear).toBeNull();
    expect(result.summary.isBankrupt).toBe(false);
  });

  describe('invariants', () => {
    const cases: Array<[string, Partial<ProjectionInput>]> = [
      ['non-integer first year', { firstYear: 2025.5 }],
      ['non-integer last year', { lastYear: 2027.5 }],
      ['non-integer birth year', { birthYear: 1960.5 }],
      ['non-integer retirement year', { retirementYear: 2026.5 }],
      ['first year after last year', { firstYear: 2030 }],
      [
        'non-consecutive years',
        {
          years: [
            { year: 2025, inflows: [], outflows: [] },
            { year: 2027, inflows: [], outflows: [] },
          ],
        },
      ],
      [
        'out-of-order years',
        {
          years: [
            { year: 2026, inflows: [], outflows: [] },
            { year: 2025, inflows: [], outflows: [] },
          ],
        },
      ],
      [
        'duplicate years',
        {
          years: [
            { year: 2025, inflows: [], outflows: [] },
            { year: 2025, inflows: [], outflows: [] },
          ],
        },
      ],
      ['year outside the range', { years: [{ year: 2024, inflows: [], outflows: [] }] }],
      ['non-integer year', { years: [{ year: 2025.5, inflows: [], outflows: [] }] }],
      ['non-finite opening', { openingNetWorth: Number.NaN }],
      ['non-finite rate', { annualReturnRate: Number.POSITIVE_INFINITY }],
      ['non-finite amount', { years: [{ year: 2025, inflows: [item(Number.NaN)], outflows: [] }] }],
      ['negative inflow', { years: [{ year: 2025, inflows: [item(-1)], outflows: [] }] }],
      ['negative outflow', { years: [{ year: 2025, inflows: [], outflows: [item(-1)] }] }],
    ];

    it.each(cases)('throws RangeError on %s', (_label, overrides) => {
      expect(() => calculateProjection(input(overrides))).toThrow(RangeError);
    });
  });
});
