import { describe, expect, it } from 'vitest';

import { DRIFT_STATUS } from '@/domains/report/reportDrift';

import { type DriftStatements, combineDrift, hasReportDrift } from './reportDrift.vm';

const amount = (
  value: number,
  previousAmount: number | null = null,
  status: (typeof DRIFT_STATUS)[keyof typeof DRIFT_STATUS] = DRIFT_STATUS.UNCHANGED,
) => ({ amount: value, previousAmount, status });

const item = (
  code: string,
  value: number,
  status: (typeof DRIFT_STATUS)[keyof typeof DRIFT_STATUS] = DRIFT_STATUS.UNCHANGED,
  subItems?: ReturnType<typeof item>[],
) => ({ code, label: code, ...amount(value, null, status), subItems });

const emptyStatements = (): DriftStatements => ({
  incomeStatement: null,
  balanceSheet: null,
  cashFlow: null,
});

const incomeStatement = (
  overrides: Partial<NonNullable<DriftStatements['incomeStatement']>> = {},
): NonNullable<DriftStatements['incomeStatement']> => ({
  incomeItems: [],
  expenseItems: [],
  incomeTotal: amount(0),
  expenseTotal: amount(0),
  netIncome: amount(0),
  ...overrides,
});

describe('combineDrift', () => {
  it('sums unchanged operands with no drift', () => {
    expect(combineDrift([amount(10), amount(5)])).toEqual({
      amount: 15,
      previousAmount: null,
      status: DRIFT_STATUS.UNCHANGED,
    });
  });

  it('flags the sum when any operand drifted', () => {
    const combined = combineDrift([amount(12, 10, DRIFT_STATUS.CHANGED), amount(5)]);

    expect(combined).toEqual({ amount: 17, previousAmount: 15, status: DRIFT_STATUS.CHANGED });
  });

  it('does not mask a drifted operand even when the totals happen to match', () => {
    // 10 -> 12 and 5 -> 3 sum to the same preview/persisted total.
    const combined = combineDrift([
      amount(12, 10, DRIFT_STATUS.CHANGED),
      amount(3, 5, DRIFT_STATUS.CHANGED),
    ]);

    expect(combined.status).toBe(DRIFT_STATUS.CHANGED);
    expect(combined.previousAmount).toBe(15);
  });

  // #237: an ADDED operand has no persisted value behind it, so the combined
  // previous total must count it as 0. Counting it as its own amount made a
  // merged parent claim a persisted total it never had — and T10's drift
  // predicate reads exactly this number.
  it('counts an added operand as zero in the persisted total', () => {
    const combined = combineDrift([amount(100, null, DRIFT_STATUS.ADDED), amount(50)]);

    expect(combined).toEqual({ amount: 150, previousAmount: 50, status: DRIFT_STATUS.CHANGED });
  });

  it('keeps a removed operand persisted amount in the total', () => {
    const combined = combineDrift([amount(0, 70, DRIFT_STATUS.REMOVED), amount(50)]);

    expect(combined).toEqual({ amount: 50, previousAmount: 120, status: DRIFT_STATUS.CHANGED });
  });

  it('treats a restructured operand persisted total as its previous value', () => {
    const combined = combineDrift([
      amount(30, 30, DRIFT_STATUS.RESTRUCTURED),
      amount(20, 40, DRIFT_STATUS.CHANGED),
    ]);

    expect(combined).toEqual({ amount: 50, previousAmount: 70, status: DRIFT_STATUS.CHANGED });
  });
});

describe('hasReportDrift', () => {
  it('reports no drift when nothing loaded', () => {
    expect(hasReportDrift(emptyStatements())).toBe(false);
  });

  it('reports no drift when no figure drifted', () => {
    const drifted = hasReportDrift({
      ...emptyStatements(),
      incomeStatement: incomeStatement({ incomeTotal: amount(50) }),
    });

    expect(drifted).toBe(false);
  });

  it('reports a changed row or its changed total', () => {
    const drifted = hasReportDrift({
      ...emptyStatements(),
      incomeStatement: incomeStatement({
        incomeItems: [item('income:salary', 12, DRIFT_STATUS.CHANGED)],
        incomeTotal: amount(12, 10, DRIFT_STATUS.CHANGED),
      }),
    });

    expect(drifted).toBe(true);
  });

  it('reports nested detail rows, not just their parent', () => {
    const drifted = hasReportDrift({
      ...emptyStatements(),
      incomeStatement: incomeStatement({
        incomeItems: [
          item('income:a', 30, DRIFT_STATUS.UNCHANGED, [
            item('income:a:1', 10, DRIFT_STATUS.CHANGED),
            item('income:a:2', 0, DRIFT_STATUS.REMOVED),
          ]),
        ],
      }),
    });

    expect(drifted).toBe(true);
  });

  it('reports an added or removed row of a balance-sheet group', () => {
    const drifted = hasReportDrift({
      ...emptyStatements(),
      balanceSheet: {
        assets: {
          total: amount(100),
          groups: {
            cash: {
              label: '現金',
              total: amount(100),
              items: [
                item('cash:new', 100, DRIFT_STATUS.ADDED),
                item('cash:gone', 0, DRIFT_STATUS.REMOVED),
              ],
            },
          },
        },
        liabilities: { total: amount(0), groups: {} },
        equity: { total: amount(0), groups: {} },
      },
    });

    expect(drifted).toBe(true);
  });

  it('reports a figure the screen does not draw as its own cell (期初/期末/調整數)', () => {
    const drifted = hasReportDrift({
      ...emptyStatements(),
      cashFlow: {
        operating: { label: '營業活動', total: amount(0), inflowItems: [], outflowItems: [] },
        investing: { label: '投資活動', total: amount(0), inflowItems: [], outflowItems: [] },
        financing: { label: '融資活動', total: amount(0), inflowItems: [], outflowItems: [] },
        netCashChange: amount(0),
        beginningBalance: amount(0),
        endingBalance: amount(0),
        actualBalance: amount(0),
        adjustment: amount(0, 500, DRIFT_STATUS.CHANGED),
      },
    });

    expect(drifted).toBe(true);
  });

  it('reports a drifted figure of the cash-flow tree', () => {
    const drifted = hasReportDrift({
      ...emptyStatements(),
      cashFlow: {
        operating: {
          label: '營業活動',
          total: amount(20),
          inflowItems: [item('operating:in:a', 20, DRIFT_STATUS.CHANGED)],
          outflowItems: [],
        },
        investing: { label: '投資活動', total: amount(0), inflowItems: [], outflowItems: [] },
        financing: { label: '融資活動', total: amount(0), inflowItems: [], outflowItems: [] },
        netCashChange: amount(20, 10, DRIFT_STATUS.CHANGED),
        beginningBalance: amount(0),
        endingBalance: amount(20, 10, DRIFT_STATUS.CHANGED),
        actualBalance: amount(20),
        adjustment: amount(0),
      },
    });

    expect(drifted).toBe(true);
  });
});
