import { describe, expect, it } from 'vitest';

import {
  DRIFT_STATUS,
  type DriftItem,
  annotateIncomeStatement,
  diffAmount,
  diffCashFlow,
  diffIncomeStatement,
  diffItems,
  diffReportTotals,
} from './reportDrift';
import { type CashFlowData, type IncomeStatementData } from './schemas';

const item = (code: string, amount: number, subItems?: { code: string; amount: number }[]) => ({
  code,
  label: code,
  amount,
  subItems: subItems?.map((sub) => ({ ...sub, label: sub.code })),
});

const byCode = (rows: DriftItem[], code: string): DriftItem =>
  rows.find((row) => row.code === code)!;

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

describe('diffReportTotals', () => {
  const totals = {
    totalAssets: 100,
    totalLiabilities: 40,
    equity: 60,
    netIncome: 20,
    netCashFlow: 5,
  };

  it('compares each Step 9 figure against the persisted total', () => {
    const drift = diffReportTotals(totals, { ...totals, equity: 50, netCashFlow: 5 });

    expect(drift.equity).toMatchObject({
      amount: 60,
      previousAmount: 50,
      status: DRIFT_STATUS.CHANGED,
    });
    expect(drift.netCashFlow.status).toBe(DRIFT_STATUS.UNCHANGED);
    expect(drift.totalAssets.status).toBe(DRIFT_STATUS.UNCHANGED);
  });

  it('leaves every figure unflagged when there is no persisted report', () => {
    const drift = diffReportTotals(totals, null);

    expect(Object.values(drift).every((value) => value.status === DRIFT_STATUS.UNCHANGED)).toBe(
      true,
    );
  });
});
