import { describe, expect, it } from 'vitest';

import {
  DRIFT_STATUS,
  type DriftItem,
  annotateIncomeStatement,
  annotateReports,
  combineDrift,
  compareReports,
  diffAmount,
  diffBalanceSheet,
  diffCashFlow,
  diffIncomeStatement,
  diffItems,
} from './reportDrift';
import { type BalanceSheetData, type CashFlowData, type IncomeStatementData } from './schemas';

const item = (code: string, amount: number, subItems?: { code: string; amount: number }[]) => ({
  code,
  label: code,
  amount,
  subItems: subItems?.map((sub) => ({ ...sub, label: sub.code })),
});

const byCode = (rows: DriftItem[], code: string): DriftItem =>
  rows.find((row) => row.code === code)!;

const amount = (
  value: number,
  previousAmount: number | null = null,
  status: (typeof DRIFT_STATUS)[keyof typeof DRIFT_STATUS] = DRIFT_STATUS.UNCHANGED,
) => ({ amount: value, previousAmount, status });

/** Every `status` string found anywhere in a drift tree — an independent walk. */
const collectStatuses = (node: unknown): string[] => {
  if (Array.isArray(node)) return node.flatMap(collectStatuses);
  if (node === null || typeof node !== 'object') return [];
  const record = node as Record<string, unknown>;
  const own = typeof record.status === 'string' ? [record.status] : [];
  return [...own, ...Object.values(record).flatMap(collectStatuses)];
};

describe('diffItems', () => {
  it('flags a leaf whose amount differs with the persisted value for the arrow', () => {
    const [row] = diffItems([item('income:salary', 12)], [item('income:salary', 10)]);

    expect(row).toMatchObject({
      code: 'income:salary',
      amount: 12,
      previousAmount: 10,
      status: DRIFT_STATUS.CHANGED,
    });
  });

  it('leaves an identical leaf unchanged', () => {
    const [row] = diffItems([item('income:salary', 12)], [item('income:salary', 12)]);

    expect(row).toMatchObject({ previousAmount: null, status: DRIFT_STATUS.UNCHANGED });
  });

  it('flags a preview-only row as added and its parent as restructured', () => {
    const preview = [
      item('income:work', 30, [item('income:work:salary', 10), item('income:work:bonus', 20)]),
    ];
    const persisted = [item('income:work', 10, [item('income:work:salary', 10)])];

    const [parent] = diffItems(preview, persisted);

    expect(parent.status).toBe(DRIFT_STATUS.RESTRUCTURED);
    expect(parent.previousAmount).toBe(10);
    expect(byCode(parent.subItems!, 'income:work:salary').status).toBe(DRIFT_STATUS.UNCHANGED);
    expect(byCode(parent.subItems!, 'income:work:bonus')).toMatchObject({
      amount: 20,
      previousAmount: null,
      status: DRIFT_STATUS.ADDED,
    });
  });

  it('flags a persisted-only row as removed and its parent as restructured', () => {
    const preview = [item('income:work', 10, [item('income:work:salary', 10)])];
    const persisted = [
      item('income:work', 10, [item('income:work:salary', 10), item('income:work:bonus', 20)]),
    ];

    const [parent] = diffItems(preview, persisted);

    expect(parent.status).toBe(DRIFT_STATUS.RESTRUCTURED);
    expect(byCode(parent.subItems!, 'income:work:bonus')).toMatchObject({
      amount: 0,
      previousAmount: 20,
      status: DRIFT_STATUS.REMOVED,
    });
  });

  it('suppresses a parent whose only change is a moved total, leaving the changed leaf to signal', () => {
    const preview = [
      item('income:work', 30, [item('income:work:salary', 15), item('income:work:bonus', 15)]),
    ];
    const persisted = [
      item('income:work', 28, [item('income:work:salary', 14), item('income:work:bonus', 14)]),
    ];

    const [parent] = diffItems(preview, persisted);

    expect(parent).toMatchObject({ status: DRIFT_STATUS.UNCHANGED, previousAmount: null });
    expect(byCode(parent.subItems!, 'income:work:salary').status).toBe(DRIFT_STATUS.CHANGED);
  });

  it('does not compare labels, only codes and amounts', () => {
    const [row] = diffItems(
      [{ code: 'income:salary', label: '薪資（新）', amount: 10 }],
      [{ code: 'income:salary', label: '薪資（舊）', amount: 10 }],
    );

    expect(row).toMatchObject({
      label: '薪資（新）',
      status: DRIFT_STATUS.UNCHANGED,
    });
  });

  it('compares the level directly and suppresses child absence when persisted lacks subItems', () => {
    const preview = [item('operating:in', 30, [item('operating:in:a', 30)])];
    const persisted = [item('operating:in', 20)];

    const [row] = diffItems(preview, persisted);

    expect(row).toMatchObject({
      amount: 30,
      previousAmount: 20,
      status: DRIFT_STATUS.CHANGED,
    });
    expect(byCode(row.subItems!, 'operating:in:a')).toMatchObject({
      previousAmount: null,
      status: DRIFT_STATUS.UNCHANGED,
    });
  });

  it('suppresses an extra persisted-level row set when persisted lacks subItems', () => {
    const preview = [item('operating:in', 30, [item('operating:in:a', 30)])];
    const persisted = [item('operating:in', 30)];

    const [row] = diffItems(preview, persisted);

    expect(row.status).toBe(DRIFT_STATUS.UNCHANGED);
    expect(byCode(row.subItems!, 'operating:in:a').status).toBe(DRIFT_STATUS.UNCHANGED);
  });

  it('appends rows only present in persisted as removed', () => {
    const rows = diffItems([item('income:a', 1)], [item('income:a', 1), item('income:b', 5)]);

    expect(byCode(rows, 'income:b')).toMatchObject({
      amount: 0,
      previousAmount: 5,
      status: DRIFT_STATUS.REMOVED,
    });
  });

  it('flags a parent as restructured when the preview rolled flat and its persisted children vanished', () => {
    const preview = [item('expense:food', 30)];
    const persisted = [
      item('expense:food', 30, [item('expense:food:a', 10), item('expense:food:b', 20)]),
    ];

    const [row] = diffItems(preview, persisted);

    expect(row).toMatchObject({ status: DRIFT_STATUS.RESTRUCTURED, previousAmount: 30 });
    expect(byCode(row.subItems!, 'expense:food:a')).toMatchObject({
      amount: 0,
      previousAmount: 10,
      status: DRIFT_STATUS.REMOVED,
    });
    expect(byCode(row.subItems!, 'expense:food:b').status).toBe(DRIFT_STATUS.REMOVED);
  });

  // Legacy persisted reports (pre-roll-up) store detail codes flat at the group
  // level while the preview nests them under the parent; compared as-is the pair
  // reads as an added parent plus a removed flat row sharing the detail's React
  // key. Folding the flat rows into their parent keeps the pair comparable.
  it('folds legacy flat detail rows into their parent before comparing', () => {
    const preview = [item('asset:property', 192345, [item('asset:property:senhuo', 192345)])];
    const persisted = [item('asset:property:senhuo', 192345)];

    const rows = diffItems(preview, persisted);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      code: 'asset:property',
      amount: 192345,
      status: DRIFT_STATUS.UNCHANGED,
    });
    expect(byCode(rows[0].subItems!, 'asset:property:senhuo')).toMatchObject({
      amount: 192345,
      status: DRIFT_STATUS.UNCHANGED,
    });
  });
});

describe('diffBalanceSheet', () => {
  const group = (label: string, total: number) => ({ label, total, items: [] });
  const build = (groups: Record<string, ReturnType<typeof group>>): BalanceSheetData => ({
    yearMonth: '2026-03',
    assets: { total: 0, groups },
    liabilities: { total: 0, groups: {} },
    equity: { total: 0, groups: {} },
  });

  // #237: a group the persisted report never had is new, so its total carries no
  // persisted value — `previousAmount: null`, exactly like a row-level ADDED.
  // It used to be `0`, one shape system with two conventions for one status.
  it('marks a preview-only group total added with no persisted value', () => {
    const drift = diffBalanceSheet(build({ cash: group('現金', 100) }), build({}));

    expect(drift.assets.groups.cash.total).toEqual({
      amount: 100,
      previousAmount: null,
      status: DRIFT_STATUS.ADDED,
    });
  });

  it('marks a persisted-only group total removed with its persisted value', () => {
    const drift = diffBalanceSheet(build({}), build({ cash: group('現金', 70) }));

    expect(drift.assets.groups.cash.total).toEqual({
      amount: 0,
      previousAmount: 70,
      status: DRIFT_STATUS.REMOVED,
    });
  });
});

describe('diffAmount', () => {
  it('marks equal totals unchanged and unequal totals changed', () => {
    expect(diffAmount(100, 100)).toEqual({
      amount: 100,
      previousAmount: null,
      status: DRIFT_STATUS.UNCHANGED,
    });
    expect(diffAmount(100, 90)).toEqual({
      amount: 100,
      previousAmount: 90,
      status: DRIFT_STATUS.CHANGED,
    });
  });
});

describe('diffIncomeStatement', () => {
  const build = (incomeTotal: number): IncomeStatementData => ({
    yearMonth: '2026-03',
    incomeTotal,
    expenseTotal: 30,
    netIncome: incomeTotal - 30,
    incomeItems: [],
    expenseItems: [],
  });

  it('compares the statement subtotal rows, not just the item trees', () => {
    const preview = build(50);
    const persisted = build(40);

    const drift = diffIncomeStatement(preview, persisted);

    expect(drift.incomeTotal).toMatchObject({
      amount: 50,
      previousAmount: 40,
      status: DRIFT_STATUS.CHANGED,
    });
    expect(drift.netIncome).toMatchObject({
      amount: 20,
      previousAmount: 10,
      status: DRIFT_STATUS.CHANGED,
    });
    expect(drift.expenseTotal.status).toBe(DRIFT_STATUS.UNCHANGED);
  });

  it('returns every row unflagged when there is no persisted report', () => {
    const preview = build(50);

    const drift = diffIncomeStatement(preview, null);

    expect(drift.incomeTotal.status).toBe(DRIFT_STATUS.UNCHANGED);
    expect(drift).toEqual(annotateIncomeStatement(preview));
  });
});

describe('diffCashFlow', () => {
  const build = (): CashFlowData => ({
    yearMonth: '2026-03',
    operating: { label: '營業活動', total: 20, inflowItems: [], outflowItems: [] },
    investing: { label: '投資活動', total: 0, inflowItems: [], outflowItems: [] },
    financing: { label: '融資活動', total: 0, inflowItems: [], outflowItems: [] },
    netCashChange: 20,
    beginningBalance: 0,
    endingBalance: 20,
    actualBalance: 20,
    adjustment: 0,
  });

  it('compares group totals and the cash-flow summary row', () => {
    const preview = build();
    const persisted = {
      ...build(),
      operating: { ...build().operating, total: 10 },
      netCashChange: 10,
    };

    const drift = diffCashFlow(preview, persisted);

    expect(drift.operating.total).toMatchObject({
      amount: 20,
      previousAmount: 10,
      status: DRIFT_STATUS.CHANGED,
    });
    expect(drift.netCashChange).toMatchObject({
      amount: 20,
      previousAmount: 10,
      status: DRIFT_STATUS.CHANGED,
    });
    expect(drift.investing.total.status).toBe(DRIFT_STATUS.UNCHANGED);
  });
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

  // #237: an ADDED operand has no persisted value, so it counts as 0.
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

describe('compareReports', () => {
  const income = (
    incomeTotal: number,
    incomeItems = [{ code: 'income:salary', label: '薪資', amount: incomeTotal }],
  ): IncomeStatementData => ({
    yearMonth: '2026-03',
    incomeTotal,
    expenseTotal: 30000,
    netIncome: incomeTotal - 30000,
    incomeItems,
    expenseItems: [{ code: 'expense:food', label: '餐飲', amount: 30000 }],
  });

  const balance = (assetsTotal: number): BalanceSheetData => ({
    yearMonth: '2026-03',
    assets: { total: assetsTotal, groups: {} },
    liabilities: { total: 0, groups: {} },
    equity: { total: assetsTotal, groups: {} },
  });

  const cashFlow = (adjustment: number): CashFlowData => ({
    yearMonth: '2026-03',
    operating: { label: '營業活動', total: 0, inflowItems: [], outflowItems: [] },
    investing: { label: '投資活動', total: 0, inflowItems: [], outflowItems: [] },
    financing: { label: '融資活動', total: 0, inflowItems: [], outflowItems: [] },
    netCashChange: 0,
    beginningBalance: 0,
    endingBalance: 0,
    actualBalance: 0,
    adjustment,
  });

  const preview = (incomeTotal = 50000, assetsTotal = 100000, adjustment = 0) => ({
    incomeStatement: income(incomeTotal),
    balanceSheet: balance(assetsTotal),
    cashFlow: cashFlow(adjustment),
  });

  it('reports no drift when the preview matches the persisted record', () => {
    const model = compareReports(preview(), preview());

    expect(model.hasAnyDrift).toBe(false);
    expect(model.incomeStatement?.incomeTotal.status).toBe(DRIFT_STATUS.UNCHANGED);
  });

  it('reports drift and annotates the changed statement when a figure moved', () => {
    const model = compareReports(preview(50000), preview(40000));

    expect(model.hasAnyDrift).toBe(true);
    expect(model.incomeStatement?.incomeTotal).toMatchObject({
      amount: 50000,
      previousAmount: 40000,
      status: DRIFT_STATUS.CHANGED,
    });
    expect(model.cashFlow?.adjustment.status).toBe(DRIFT_STATUS.UNCHANGED);
  });

  it('reports a drifted nested detail row, not just its parent', () => {
    const previewModel = preview(30, 100000, 0);
    previewModel.incomeStatement = income(30, [
      { code: 'income:work', label: '工作', amount: 30 },
      { code: 'income:bonus', label: '獎金', amount: 20 },
    ]);
    const persisted = preview(30, 100000, 0);
    persisted.incomeStatement = income(30, [{ code: 'income:work', label: '工作', amount: 30 }]);

    const model = compareReports(previewModel, persisted);

    expect(model.hasAnyDrift).toBe(true);
  });

  it('reports a drifted balance-sheet group item', () => {
    const previewModel = preview(50000, 100000, 0);
    previewModel.balanceSheet = {
      ...balance(100000),
      assets: {
        total: 100000,
        groups: {
          cash: {
            label: '現金',
            total: 100000,
            items: [{ code: 'cash:new', label: '新', amount: 100000 }],
          },
        },
      },
    };
    const persisted = preview(50000, 100000, 0);
    persisted.balanceSheet = balance(100000);

    const model = compareReports(previewModel, persisted);

    expect(model.hasAnyDrift).toBe(true);
  });

  it('reports a drifted figure the screen does not draw as its own cell (調整數)', () => {
    const model = compareReports(preview(50000, 100000, 500), preview(50000, 100000, 0));

    expect(model.hasAnyDrift).toBe(true);
  });

  it('leaves every tree unflagged when there is no persisted report', () => {
    const model = compareReports(preview(), null);

    expect(model.hasAnyDrift).toBe(false);
    expect(model.incomeStatement?.incomeTotal.status).toBe(DRIFT_STATUS.UNCHANGED);
    expect(model.balanceSheet?.assets.total.status).toBe(DRIFT_STATUS.UNCHANGED);
  });

  it('reports drift for a removed and a restructured node, not only CHANGED', () => {
    const withItems = (items: IncomeStatementData['incomeItems']) => ({
      ...preview(30000, 100000, 0),
      incomeStatement: { ...income(30000), incomeItems: items },
    });

    const previewModel = withItems([
      {
        code: 'income:a',
        label: 'A',
        amount: 30000,
        subItems: [{ code: 'income:a:1', label: 'A1', amount: 30000 }],
      },
    ]);
    const persisted = withItems([
      {
        code: 'income:a',
        label: 'A',
        amount: 30000,
        subItems: [
          { code: 'income:a:1', label: 'A1', amount: 20000 },
          { code: 'income:a:2', label: 'A2', amount: 10000 },
        ],
      },
    ]);

    const model = compareReports(previewModel, persisted);

    expect(collectStatuses(model.incomeStatement)).toContain(DRIFT_STATUS.REMOVED);
    expect(collectStatuses(model.incomeStatement)).toContain(DRIFT_STATUS.RESTRUCTURED);
    expect(model.hasAnyDrift).toBe(true);
  });

  // The acceptance property: hasAnyDrift iff some node is not UNCHANGED.
  it('derives hasAnyDrift iff some node drifted', () => {
    const cases: [ReturnType<typeof preview>, ReturnType<typeof preview> | null][] = [
      [preview(), preview()],
      [preview(50000), preview(40000)],
      [preview(50000, 100000, 500), preview(50000)],
      [preview(), null],
    ];

    for (const [previewModel, persisted] of cases) {
      const model = compareReports(previewModel, persisted);
      const anyDrifted = collectStatuses([
        model.incomeStatement,
        model.balanceSheet,
        model.cashFlow,
      ]).some((status) => status !== DRIFT_STATUS.UNCHANGED);

      expect(model.hasAnyDrift).toBe(anyDrifted);
    }
  });
});

describe('annotateReports', () => {
  it('shows the persisted record with no drift marks and no drift', () => {
    const persisted = {
      incomeStatement: {
        yearMonth: '2026-03',
        incomeTotal: 40000,
        expenseTotal: 30000,
        netIncome: 10000,
        incomeItems: [],
        expenseItems: [],
      },
      balanceSheet: {
        yearMonth: '2026-03',
        assets: { total: 100000, groups: {} },
        liabilities: { total: 0, groups: {} },
        equity: { total: 100000, groups: {} },
      },
      cashFlow: null,
    };

    const model = annotateReports(persisted);

    expect(model.hasAnyDrift).toBe(false);
    expect(model.incomeStatement?.incomeTotal).toEqual({
      amount: 40000,
      previousAmount: null,
      status: DRIFT_STATUS.UNCHANGED,
    });
    expect(model.cashFlow).toBeNull();
  });

  it('returns an empty model when there is no persisted record', () => {
    const model = annotateReports(null);

    expect(model.hasAnyDrift).toBe(false);
    expect(model.incomeStatement).toBeNull();
    expect(model.balanceSheet).toBeNull();
    expect(model.cashFlow).toBeNull();
  });
});
