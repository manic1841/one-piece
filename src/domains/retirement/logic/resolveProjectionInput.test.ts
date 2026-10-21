import { describe, expect, it } from 'vitest';

import type { RetirementAssumptions } from '../assumptions';
import type { LifeEvent } from '../lifeEvents';
import type { EndCondition, ProjectionRule, RuleType } from '../projectionRules';
import {
  type ResolveProjectionInputParams,
  type ResolveProjectionInputResult,
  resolveProjectionInput,
} from './resolveProjectionInput';

const assumptions = (overrides: Partial<RetirementAssumptions> = {}): RetirementAssumptions => ({
  birthYear: 1980,
  retirementAge: 65,
  lifeExpectancy: 85,
  inflationRate: 0.02,
  annualReturnRate: 0.05,
  ...overrides,
});

interface RuleOverrides {
  id?: string;
  name?: string;
  ruleType?: RuleType;
  enabled?: boolean;
}

function baseRule(overrides: RuleOverrides) {
  return {
    id: 'rule-1',
    name: 'Rule',
    ruleType: 'expense' as RuleType,
    enabled: true,
    ...overrides,
  };
}

function fixedRule(overrides: RuleOverrides & { amount?: number; end?: EndCondition }) {
  return {
    ...baseRule(overrides),
    method: 'fixedAmount',
    parameters: { amount: overrides.amount ?? 100 },
    endCondition: overrides.end ?? { type: 'lifelong' },
  } as ProjectionRule;
}

function percentageRule(
  overrides: RuleOverrides & { targetId: string; ratio?: number; end?: EndCondition },
) {
  return {
    ...baseRule(overrides),
    method: 'percentage',
    source: { type: 'rule', id: overrides.targetId },
    parameters: { ratio: overrides.ratio ?? 0.5 },
    endCondition: overrides.end ?? { type: 'lifelong' },
  } as ProjectionRule;
}

function inflationRule(
  overrides: RuleOverrides & {
    ledgerCodeId: string;
    baselinePolicy?: 'previousCompleteYear' | 'specificYear';
    end?: EndCondition;
  },
) {
  return {
    ...baseRule(overrides),
    method: 'inflation',
    source: { type: 'ledgerCode', id: overrides.ledgerCodeId },
    parameters: {},
    baselinePolicy: overrides.baselinePolicy ?? 'previousCompleteYear',
    endCondition: overrides.end ?? { type: 'lifelong' },
  } as ProjectionRule;
}

function growthRule(
  overrides: RuleOverrides & {
    ledgerCodeId: string;
    rate?: number;
    baselinePolicy?: 'previousCompleteYear' | 'specificYear';
    end?: EndCondition;
  },
) {
  return {
    ...baseRule(overrides),
    method: 'growthRate',
    source: { type: 'ledgerCode', id: overrides.ledgerCodeId },
    parameters: { rate: overrides.rate ?? 0.1 },
    baselinePolicy: overrides.baselinePolicy ?? 'previousCompleteYear',
    endCondition: overrides.end ?? { type: 'lifelong' },
  } as ProjectionRule;
}

function ruleSourceFixedRule(overrides: RuleOverrides & { targetId: string; end?: EndCondition }) {
  return {
    ...baseRule(overrides),
    method: 'fixedAmount',
    parameters: { amount: 0 },
    source: { type: 'rule', id: overrides.targetId },
    endCondition: overrides.end ?? { type: 'lifelong' },
  } as ProjectionRule;
}

function debtRule(overrides: RuleOverrides & { debtAccountId: string }) {
  return {
    ...baseRule(overrides),
    id: overrides.id ?? 'debt-rule',
    method: 'debtAmortization',
    source: { type: 'debtAccount', id: overrides.debtAccountId },
    parameters: {},
  } as ProjectionRule;
}

function ledger(entries: Record<number, [credit: number, debit: number]>) {
  const netByYear = new Map<number, number>();
  for (const [year, [credit, debit]] of Object.entries(entries)) {
    netByYear.set(Number(year), credit - debit);
  }
  return new Map([['code-1', { netByYear }]]);
}

function baseParams(
  overrides: Partial<ResolveProjectionInputParams> = {},
): ResolveProjectionInputParams {
  return {
    assumptions: assumptions(),
    rules: [],
    lifeEvents: [],
    startYear: 2025,
    opening: { amount: 1_000, source: 'manual' },
    ledgerSources: new Map(),
    debtAccounts: new Map(),
    ...overrides,
  };
}

function expectOk(result: ResolveProjectionInputResult) {
  if (!result.ok) {
    throw new Error(`expected ok, got errors: ${JSON.stringify(result.errors)}`);
  }
  return result;
}

function items(result: ResolveProjectionInputResult, year: number, side: 'inflows' | 'outflows') {
  const input = expectOk(result).input;
  const entry = input.years.find((candidate) => candidate.year === year);
  return entry?.[side] ?? [];
}

function codes(result: ResolveProjectionInputResult) {
  return result.ok ? [] : result.errors.map((error) => error.code).sort();
}

describe('resolveProjectionInput', () => {
  describe('opening net worth', () => {
    it('uses a manual amount, including negative values, and emits no anchor warning', () => {
      const result = expectOk(
        resolveProjectionInput(baseParams({ opening: { amount: -500, source: 'manual' } })),
      );

      expect(result.input.openingNetWorth).toBe(-500);
      expect(result.warnings).toEqual([]);
    });

    it('warns BASELINE_BEHIND when the derived anchor is before the start year', () => {
      const result = expectOk(
        resolveProjectionInput(
          baseParams({
            opening: { amount: 1_000, source: 'derived', anchorYearMonth: '2023-06' },
          }),
        ),
      );

      expect(result.warnings).toEqual([
        {
          code: 'BASELINE_BEHIND',
          params: { anchorYearMonth: '2023-06', anchorYear: 2023, startYear: 2025 },
          severity: 'warning',
        },
      ]);
    });

    it('warns BASELINE_AFTER_START when the derived anchor is after the start year', () => {
      const result = expectOk(
        resolveProjectionInput(
          baseParams({
            opening: { amount: 1_000, source: 'derived', anchorYearMonth: '2026-03' },
          }),
        ),
      );

      expect(result.warnings).toEqual([
        {
          code: 'BASELINE_AFTER_START',
          params: { anchorYearMonth: '2026-03', anchorYear: 2026, startYear: 2025 },
          severity: 'warning',
        },
      ]);
    });

    it('fails with MISSING_BASELINE kind opening when the amount is absent', () => {
      const result = resolveProjectionInput(
        baseParams({ opening: { amount: undefined, source: 'derived' } }),
      );

      expect(result.ok).toBe(false);
      expect(codes(result)).toEqual(['MISSING_BASELINE']);
      if (!result.ok) {
        expect(result.errors[0].params).toEqual({ kind: 'opening' });
        expect(result.errors[0].severity).toBe('error');
      }
    });
  });

  describe('range', () => {
    it('derives first, last and retirement year from assumptions', () => {
      const result = expectOk(resolveProjectionInput(baseParams()));

      expect(result.input.firstYear).toBe(2025);
      expect(result.input.lastYear).toBe(2065);
      expect(result.input.retirementYear).toBe(2045);
      expect(result.input.birthYear).toBe(1980);
      expect(result.input.years.map((entry) => entry.year)).toEqual(
        Array.from({ length: 41 }, (_, index) => 2025 + index),
      );
    });
  });

  describe('method expansion', () => {
    it('emits a fixed amount every year and routes by ruleType', () => {
      const result = expectOk(
        resolveProjectionInput(
          baseParams({ rules: [fixedRule({ ruleType: 'expense', amount: 100 })] }),
        ),
      );

      expect(items(result, 2025, 'outflows')).toEqual([
        { sourceRef: 'rule-1', label: 'Rule', origin: 'rule', amount: 100 },
      ]);
      expect(items(result, 2065, 'outflows')).toHaveLength(1);
    });

    it('compounds an inflation baseline from the previous complete year', () => {
      const result = expectOk(
        resolveProjectionInput(
          baseParams({
            rules: [inflationRule({ ledgerCodeId: 'code-1' })],
            ledgerSources: ledger({ 2024: [1_000, 250] }),
          }),
        ),
      );

      expect(items(result, 2024, 'outflows')).toHaveLength(0);
      expect(items(result, 2025, 'outflows')[0].amount).toBeCloseTo(765);
      expect(items(result, 2026, 'outflows')[0].amount).toBeCloseTo(780.3);
      expect(expectOk(result).ruleSources).toEqual([
        {
          ruleId: 'rule-1',
          sourceType: 'ledgerCode',
          sourceId: 'code-1',
          baselineYear: 2024,
          baselineAmount: 750,
        },
      ]);
    });

    it('takes the absolute value of a negative net baseline', () => {
      const result = expectOk(
        resolveProjectionInput(
          baseParams({
            rules: [inflationRule({ ledgerCodeId: 'code-1' })],
            ledgerSources: ledger({ 2024: [250, 1_000] }),
          }),
        ),
      );

      expect(items(result, 2025, 'outflows')[0].amount).toBeCloseTo(765);
    });

    it('compounds a growth rate from a specific earlier year and warns BASELINE_BEHIND', () => {
      const result = expectOk(
        resolveProjectionInput(
          baseParams({
            rules: [
              {
                ...growthRule({
                  ledgerCodeId: 'code-1',
                  rate: 0.1,
                  baselinePolicy: 'specificYear',
                }),
                baselineYear: 2023,
              },
            ],
            ledgerSources: ledger({ 2023: [100, 600] }),
          }),
        ),
      );

      expect(items(result, 2025, 'outflows')[0].amount).toBeCloseTo(500 * 1.1 ** 2);
      expect(result.warnings).toContainEqual({
        code: 'BASELINE_BEHIND',
        params: { ruleId: 'rule-1', baselineYear: 2023 },
        severity: 'warning',
      });
    });

    it('warns BASELINE_AFTER_START when the baseline is newer than the previous year', () => {
      const result = expectOk(
        resolveProjectionInput(
          baseParams({
            rules: [
              {
                ...inflationRule({ ledgerCodeId: 'code-1', baselinePolicy: 'specificYear' }),
                baselineYear: 2025,
              },
            ],
            ledgerSources: ledger({ 2025: [100, 0] }),
          }),
        ),
      );

      expect(result.warnings).toContainEqual({
        code: 'BASELINE_AFTER_START',
        params: { ruleId: 'rule-1', baselineYear: 2025 },
        severity: 'warning',
      });
    });

    it('expands a percentage from the referenced rule in the same year', () => {
      const base = fixedRule({ id: 'base', ruleType: 'income', amount: 1_000 });
      const dependent = percentageRule({ id: 'pct', ruleType: 'income', targetId: 'base' });
      const result = expectOk(resolveProjectionInput(baseParams({ rules: [base, dependent] })));

      expect(items(result, 2025, 'inflows')).toContainEqual({
        sourceRef: 'pct',
        label: 'Rule',
        origin: 'rule',
        amount: 500,
      });
    });

    it('returns 0 from a percentage when the referenced rule has no amount that year', () => {
      const base = fixedRule({
        id: 'base',
        ruleType: 'income',
        amount: 1_000,
        end: { type: 'specificYear', year: 2025 },
      });
      const dependent = percentageRule({ id: 'pct', ruleType: 'income', targetId: 'base' });
      const result = expectOk(resolveProjectionInput(baseParams({ rules: [base, dependent] })));

      expect(items(result, 2025, 'inflows').find((item) => item.sourceRef === 'pct')?.amount).toBe(
        500,
      );
      expect(items(result, 2026, 'inflows')).toContainEqual({
        sourceRef: 'pct',
        label: 'Rule',
        origin: 'rule',
        amount: 0,
      });
    });

    it('applies growth once per year on top of a referenced rule', () => {
      const base = fixedRule({ id: 'base', ruleType: 'income', amount: 100 });
      const grown = {
        ...baseRule({ id: 'grown', name: 'Grown', ruleType: 'income' }),
        method: 'growthRate' as const,
        source: { type: 'rule' as const, id: 'base' },
        parameters: { rate: 0.1 },
        endCondition: { type: 'lifelong' as const },
      } as ProjectionRule;

      const result = expectOk(resolveProjectionInput(baseParams({ rules: [base, grown] })));

      expect(
        items(result, 2025, 'inflows').find((item) => item.sourceRef === 'grown')?.amount,
      ).toBeCloseTo(110);
      expect(
        items(result, 2026, 'inflows').find((item) => item.sourceRef === 'grown')?.amount,
      ).toBeCloseTo(110);
    });

    it('omits a disabled rule and treats a reference to it as 0', () => {
      const base = fixedRule({ id: 'base', ruleType: 'income', enabled: false });
      const dependent = percentageRule({ id: 'pct', ruleType: 'income', targetId: 'base' });
      const result = expectOk(resolveProjectionInput(baseParams({ rules: [base, dependent] })));

      expect(items(result, 2025, 'inflows')).toContainEqual({
        sourceRef: 'pct',
        label: 'Rule',
        origin: 'rule',
        amount: 0,
      });
      expect(result.warnings).toEqual([]);
    });

    it('pays a debt monthly payment for whole years through the end date', () => {
      const result = expectOk(
        resolveProjectionInput(
          baseParams({
            rules: [debtRule({ debtAccountId: 'debt-1' })],
            debtAccounts: new Map([
              ['debt-1', { monthlyPayment: 1_000, endDate: new Date('2027-06-15') }],
            ]),
          }),
        ),
      );

      expect(items(result, 2025, 'outflows')[0].amount).toBe(12_000);
      expect(items(result, 2027, 'outflows')[0].amount).toBe(12_000);
      expect(items(result, 2028, 'outflows')).toHaveLength(0);
    });
  });

  describe('end conditions', () => {
    const cases: Array<[EndCondition, number]> = [
      [{ type: 'retirementYearExclusive' }, 2044],
      [{ type: 'specificAge', age: 70 }, 2050],
      [{ type: 'specificYear', year: 2030 }, 2030],
      [{ type: 'lifelong' }, 2065],
    ];

    it.each(cases)('stops at %j', (end, lastYear) => {
      const result = expectOk(resolveProjectionInput(baseParams({ rules: [fixedRule({ end })] })));

      expect(items(result, lastYear, 'outflows')).toHaveLength(1);
      expect(items(result, lastYear + 1, 'outflows')).toHaveLength(0);
    });

    it('emits nothing when the period ends before the start year', () => {
      const result = expectOk(
        resolveProjectionInput(
          baseParams({ rules: [fixedRule({ end: { type: 'specificYear', year: 2020 } })] }),
        ),
      );

      expect(result.input.years.every((entry) => entry.outflows.length === 0)).toBe(true);
    });
  });

  describe('errors', () => {
    it('reports a missing ledger code', () => {
      const result = resolveProjectionInput(
        baseParams({ rules: [inflationRule({ ledgerCodeId: 'code-1' })] }),
      );

      expect(codes(result)).toEqual(['MISSING_LEDGER_CODE']);
      if (!result.ok) {
        expect(result.errors[0].params).toEqual({ ruleId: 'rule-1', ledgerCodeId: 'code-1' });
        expect(result.errors[0].severity).toBe('error');
      }
    });

    it('reports a missing baseline entry with the rule kind', () => {
      const result = resolveProjectionInput(
        baseParams({
          rules: [inflationRule({ ledgerCodeId: 'code-1' })],
          ledgerSources: ledger({ 2020: [100, 0] }),
        }),
      );

      expect(codes(result)).toEqual(['MISSING_BASELINE']);
      if (!result.ok) expect(result.errors[0].params).toEqual({ kind: 'rule', ruleId: 'rule-1' });
    });

    it('reports a missing debt account', () => {
      const result = resolveProjectionInput(
        baseParams({ rules: [debtRule({ debtAccountId: 'debt-1' })] }),
      );

      expect(codes(result)).toEqual(['MISSING_DEBT_ACCOUNT']);
      if (!result.ok) {
        expect(result.errors[0].params).toEqual({ ruleId: 'debt-rule', debtAccountId: 'debt-1' });
      }
    });

    it('warns DEBT_ENDED_BEFORE_START without failing', () => {
      const result = expectOk(
        resolveProjectionInput(
          baseParams({
            rules: [debtRule({ debtAccountId: 'debt-1' })],
            debtAccounts: new Map([
              ['debt-1', { monthlyPayment: 1_000, endDate: new Date('2024-03-01') }],
            ]),
          }),
        ),
      );

      expect(result.warnings).toEqual([
        {
          code: 'DEBT_ENDED_BEFORE_START',
          params: { ruleId: 'debt-rule', debtAccountId: 'debt-1', endYear: 2024 },
          severity: 'warning',
        },
      ]);
      expect(result.input.years.every((entry) => entry.outflows.length === 0)).toBe(true);
    });

    it('reports a dangling reference from the graph', () => {
      const result = resolveProjectionInput(
        baseParams({ rules: [ruleSourceFixedRule({ targetId: 'missing' })] }),
      );

      expect(codes(result)).toEqual(['DANGLING_REFERENCE']);
      if (!result.ok) {
        expect(result.errors[0].params).toEqual({ ruleId: 'rule-1', targetId: 'missing' });
      }
    });

    it('reports a cycle with its full path', () => {
      const rules = [
        ruleSourceFixedRule({ id: 'a', targetId: 'b' }),
        ruleSourceFixedRule({ id: 'b', targetId: 'a' }),
      ];
      const result = resolveProjectionInput(baseParams({ rules }));

      expect(codes(result)).toEqual(['CYCLE']);
      if (!result.ok) expect(result.errors[0].params).toEqual({ ruleIds: ['a', 'b', 'a'] });
    });

    it('reports a self cycle as CYCLE', () => {
      const result = resolveProjectionInput(
        baseParams({ rules: [ruleSourceFixedRule({ id: 'a', targetId: 'a' })] }),
      );

      expect(codes(result)).toEqual(['CYCLE']);
      if (!result.ok) expect(result.errors[0].params).toEqual({ ruleIds: ['a', 'a'] });
    });

    it('collects every independent error in one pass', () => {
      const rules = [
        inflationRule({ id: 'missing-ledger', ledgerCodeId: 'unknown' }),
        inflationRule({ id: 'missing-baseline', ledgerCodeId: 'empty' }),
        debtRule({ id: 'missing-debt', debtAccountId: 'unknown' }),
        ruleSourceFixedRule({ id: 'dangling', targetId: 'nope' }),
      ];
      const result = resolveProjectionInput(
        baseParams({
          rules,
          ledgerSources: new Map([['empty', { netByYear: new Map() }]]),
        }),
      );

      expect(result.ok).toBe(false);
      expect(codes(result)).toEqual([
        'DANGLING_REFERENCE',
        'MISSING_BASELINE',
        'MISSING_DEBT_ACCOUNT',
        'MISSING_LEDGER_CODE',
      ]);
    });
  });

  describe('life events', () => {
    const event = (overrides: Partial<LifeEvent> = {}): LifeEvent => ({
      id: 'event-1',
      name: 'Event',
      type: 'expense',
      enabled: true,
      phases: [{ startYear: 2025, endYear: 2026, amount: 100 }],
      ...overrides,
    });

    it('clips a phase to the projection range and grows by the default inflation', () => {
      const result = expectOk(
        resolveProjectionInput(
          baseParams({
            lifeEvents: [event({ phases: [{ startYear: 2020, endYear: 2026, amount: 100 }] })],
          }),
        ),
      );

      expect(result.input.firstYear).toBe(2025);
      expect(items(result, 2025, 'outflows')[0].amount).toBeCloseTo(100 * 1.02 ** 5);
      expect(items(result, 2026, 'outflows')[0].amount).toBeCloseTo(100 * 1.02 ** 6);
    });

    it('uses an explicit phase growth rate over inflation', () => {
      const result = expectOk(
        resolveProjectionInput(
          baseParams({
            lifeEvents: [
              event({ phases: [{ startYear: 2025, endYear: 2026, amount: 100, growthRate: 0.1 }] }),
            ],
          }),
        ),
      );

      expect(items(result, 2026, 'outflows')[0].amount).toBeCloseTo(110);
    });

    it('omits disabled events and allows zero amounts', () => {
      const result = expectOk(
        resolveProjectionInput(
          baseParams({
            lifeEvents: [
              event({ id: 'disabled', enabled: false }),
              event({ id: 'zero', phases: [{ startYear: 2025, endYear: 2025, amount: 0 }] }),
            ],
          }),
        ),
      );

      expect(items(result, 2025, 'outflows')).toEqual([
        { sourceRef: 'zero', label: 'Event', origin: 'event', amount: 0 },
      ]);
    });

    it('routes event items by event type', () => {
      const result = expectOk(
        resolveProjectionInput(baseParams({ lifeEvents: [event({ type: 'income' })] })),
      );

      expect(items(result, 2025, 'inflows')[0].sourceRef).toBe('event-1');
    });
  });
});
