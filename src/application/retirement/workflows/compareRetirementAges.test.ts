import { describe, expect, it } from 'vitest';

import { type ResolveProjectionInputParams } from '@/domains/retirement/resolveProjectionInput';

import {
  calculateRetirementAge,
  compareRetirementAges,
  retirementComparisonBounds,
} from './compareRetirementAges';

function fixture(): ResolveProjectionInputParams {
  return {
    startYear: 2026,
    opening: { source: 'derived', amount: 100, anchorYearMonth: '2025-12' },
    assumptions: {
      birthYear: 1990,
      retirementAge: 39,
      lifeExpectancy: 40,
      inflationRate: 0,
      annualReturnRate: 0,
    },
    rules: [
      {
        id: 'salary',
        name: 'Salary',
        enabled: true,
        ruleType: 'income',
        method: 'inflation',
        parameters: {},
        baselinePolicy: 'previousCompleteYear',
        source: { type: 'ledgerCode', id: 'salary' },
        endCondition: { type: 'retirementYearExclusive' },
      },
      {
        id: 'cost',
        name: 'Living costs',
        enabled: true,
        ruleType: 'expense',
        method: 'fixedAmount',
        parameters: { amount: 100 },
        endCondition: { type: 'lifelong' },
      },
    ],
    lifeEvents: [
      {
        id: 'trip',
        name: 'Trip',
        enabled: true,
        type: 'expense',
        phases: [{ startYear: 2028, endYear: 2028, amount: 50 }],
      },
    ],
    ledgerSources: new Map([['salary', { netByYear: new Map([[2025, 200]]) }]]),
    debtAccounts: new Map(),
  };
}

describe('retirement age comparison', () => {
  it('changes retirement-linked rules, retains calendar events, and keeps only summaries', () => {
    const input = fixture();
    const before = structuredClone(input);
    const comparisons = compareRetirementAges(input, 2026);
    expect(comparisons.map((row) => row.age)).toEqual([36, 37, 38, 39]);
    expect(comparisons.find((row) => row.outcome.ok && !row.outcome.summary.isBankrupt)?.age).toBe(
      39,
    );
    expect(comparisons[0]?.outcome).toEqual({
      ok: true,
      summary: {
        retirementNetWorth: 100,
        finalNetWorth: -450,
        minNetWorth: -350,
        minNetWorthYear: 2030,
        bankruptcyYear: 2027,
        isBankrupt: true,
      },
    });
    expect(comparisons[3]?.outcome).toMatchObject({
      ok: true,
      summary: { finalNetWorth: 150, isBankrupt: false },
    });
    expect(input).toEqual(before);
  });

  it('applying reproduces a trial summary and retains a consistent input/config/source snapshot', () => {
    const input = fixture();
    const trial = compareRetirementAges(input, 2026).find((row) => row.age === 38);
    const applied = calculateRetirementAge(input, 38, 2026);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(trial?.outcome).toEqual({ ok: true, summary: applied.calculation.result.summary });
    expect(applied.calculation.config.assumptions.retirementAge).toBe(38);
    expect(applied.calculation.input.retirementYear).toBe(2028);
    expect(applied.calculation.config.openingNetWorth).toEqual(input.opening);
    expect(applied.calculation.source.ruleSources).toContainEqual({
      ruleId: 'salary',
      sourceType: 'ledgerCode',
      sourceId: 'salary',
      baselineYear: 2025,
      baselineAmount: 200,
    });
    expect(applied.calculation.input.years.find((year) => year.year === 2028)).toMatchObject({
      inflows: [],
      outflows: expect.arrayContaining([
        expect.objectContaining({ sourceRef: 'trip', amount: 50 }),
      ]),
    });
  });

  it('resolves percentage references again instead of shifting already-resolved cash flows', () => {
    const input = fixture();
    input.rules.push({
      id: 'tax',
      name: 'Tax',
      enabled: true,
      ruleType: 'expense',
      method: 'percentage',
      parameters: { ratio: 0.1 },
      source: { type: 'rule', id: 'salary' },
      endCondition: { type: 'lifelong' },
    });
    const applied = calculateRetirementAge(input, 38, 2026);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const tax = (year: number) =>
      applied.calculation.input.years
        .find((entry) => entry.year === year)
        ?.outflows.find((item) => item.sourceRef === 'tax')?.amount ?? 0;
    expect(tax(2027)).toBe(20);
    expect(tax(2028)).toBe(0);
  });

  it('preserves debt payment and end date facts without another read', () => {
    const input = fixture();
    input.rules.push({
      id: 'loan',
      name: 'Loan',
      enabled: true,
      ruleType: 'expense',
      method: 'debtAmortization',
      parameters: {},
      source: { type: 'debtAccount', id: 'loan' },
    });
    input.debtAccounts.set('loan', { monthlyPayment: 10, endDate: new Date(2027, 5, 1) });
    const applied = calculateRetirementAge(input, 38, 2026);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const years = applied.calculation.input.years;
    expect(years[0]?.outflows).toContainEqual(
      expect.objectContaining({ sourceRef: 'loan', amount: 120 }),
    );
    expect(years[2]?.outflows.some((item) => item.sourceRef === 'loan')).toBe(false);
  });

  it('reports failed ages rather than treating missing source data as no bankruptcy', () => {
    const input = fixture();
    input.ledgerSources.clear();
    expect(compareRetirementAges(input, 2026).every((row) => !row.outcome.ok)).toBe(true);
  });

  it('does not assume retiring later is always safer', () => {
    const input = fixture();
    input.rules[0]!.endCondition = { type: 'lifelong' };
    input.rules[1]!.parameters = { amount: 500 };
    input.rules[1]!.endCondition = { type: 'retirementYearExclusive' };
    const comparisons = compareRetirementAges(input, 2026);
    expect(comparisons[0]?.outcome).toMatchObject({ ok: true, summary: { isBankrupt: false } });
    expect(comparisons.at(-1)?.outcome).toMatchObject({ ok: true, summary: { isBankrupt: true } });
  });

  it('handles no safe age, all safe ages and no available age', () => {
    const input = fixture();
    input.opening.amount = -10_000;
    expect(
      compareRetirementAges(input, 2026).some(
        (row) => row.outcome.ok && !row.outcome.summary.isBankrupt,
      ),
    ).toBe(false);
    input.opening.amount = 10_000;
    expect(
      compareRetirementAges(input, 2026).every(
        (row) => row.outcome.ok && !row.outcome.summary.isBankrupt,
      ),
    ).toBe(true);
    input.assumptions.lifeExpectancy = 36;
    expect(compareRetirementAges(input, 2026)).toEqual([]);
  });

  it('uses the later of today/start, excludes life expectancy and respects schema bounds', () => {
    const input = fixture();
    input.startYear = 2028;
    expect(retirementComparisonBounds(input, 2026)).toEqual({ min: 38, max: 39 });
    input.assumptions.lifeExpectancy = 130;
    expect(retirementComparisonBounds(input, 2026).max).toBe(120);
    for (const age of [37, 130, 38.5, Number.NaN]) {
      expect(calculateRetirementAge(input, age, 2026).ok).toBe(false);
    }
  });
});
