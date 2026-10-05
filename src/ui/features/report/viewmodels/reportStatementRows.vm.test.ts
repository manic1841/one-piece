import { describe, expect, it } from 'vitest';

import { type StatementRow } from '@/ui/components/statement/StatementTable';
import { formatCurrency } from '@/ui/utils';

import {
  type BalanceSheetGroupVM,
  type BalanceSheetVM,
  type CashFlowGroupVM,
  type CashFlowVM,
  type IncomeStatementVM,
} from './reportDisplay.vm';
import {
  buildBalanceSheetRows,
  buildCashFlowRows,
  buildIncomeStatementRows,
} from './reportStatementRows.vm';

/** `StatementTable` 以 `flattenRows` 攤平樹狀列；測試用同一視角斷言。 */
const flatten = (rows: StatementRow[]): StatementRow[] =>
  rows.flatMap((row) => [row, ...flatten(row.children)]);

const group = (
  label: string,
  total: number,
  items: BalanceSheetGroupVM['items'] = [],
): BalanceSheetGroupVM => ({ label, total, totalText: formatCurrency(total), items });

const side = (
  total: number,
  groups: Record<string, BalanceSheetGroupVM>,
): BalanceSheetVM['assets'] => ({ total, totalText: formatCurrency(total), groups });

const incomeVM = (over: Partial<IncomeStatementVM> = {}): IncomeStatementVM => ({
  yearMonth: '2026-06',
  incomeTotal: 0,
  incomeTotalText: formatCurrency(0),
  expenseTotal: 0,
  expenseTotalText: formatCurrency(0),
  netIncome: 0,
  netIncomeText: formatCurrency(0),
  incomeItems: [],
  expenseItems: [],
  ...over,
});

const balanceVM = (over: Partial<BalanceSheetVM> = {}): BalanceSheetVM => ({
  yearMonth: '2026-06',
  assets: side(0, {}),
  liabilities: side(0, {}),
  equity: side(0, {}),
  ...over,
});

const cashFlowGroup = (total: number, over: Partial<CashFlowGroupVM> = {}): CashFlowGroupVM => ({
  label: '營業活動',
  total,
  totalText: formatCurrency(total),
  inflowItems: [],
  outflowItems: [],
  ...over,
});

const item = (code: string, label: string, amount: number) => ({
  code,
  label,
  amount,
  amountText: formatCurrency(amount),
});

const cashFlowVM = (over: Partial<CashFlowVM> = {}): CashFlowVM => ({
  yearMonth: '2026-06',
  operating: cashFlowGroup(0),
  investing: cashFlowGroup(0),
  financing: cashFlowGroup(0),
  netCashChange: 0,
  netCashChangeText: formatCurrency(0),
  beginningBalance: 0,
  beginningBalanceText: formatCurrency(0),
  endingBalance: 0,
  endingBalanceText: formatCurrency(0),
  actualBalance: 0,
  actualBalanceText: formatCurrency(0),
  adjustment: 0,
  adjustmentText: formatCurrency(0),
  ...over,
});

describe('buildIncomeStatementRows', () => {
  it('renders both sections, their totals, and the net income terminus', () => {
    const rows = buildIncomeStatementRows(
      incomeVM({
        incomeTotal: 50000,
        incomeTotalText: formatCurrency(50000),
        incomeItems: [item('I1', '薪資', 50000)],
        expenseTotal: 20000,
        expenseTotalText: formatCurrency(20000),
        expenseItems: [item('E1', '房租', 20000)],
        netIncome: 30000,
        netIncomeText: formatCurrency(30000),
      }),
    );

    expect(flatten(rows).map((row) => [row.label, row.tone])).toEqual([
      ['收入', 'section'],
      ['薪資', 'group'],
      ['收入合計', 'subtotal'],
      ['支出', 'section'],
      ['房租', 'group'],
      ['支出合計', 'subtotal'],
      ['本期淨利', 'terminus'],
    ]);
    expect(rows.at(-1)).toMatchObject({ amountText: formatCurrency(30000) });
  });

  it('omits an empty section but always keeps the terminus', () => {
    const rows = buildIncomeStatementRows(incomeVM());

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ key: 'terminus', label: '本期淨利' });
  });
});

describe('buildBalanceSheetRows', () => {
  it('filters empty asset/liability groups but keeps every equity source', () => {
    const rows = buildBalanceSheetRows(
      balanceVM({
        assets: side(0, { cash: group('現金', 0) }),
        equity: side(0, { opening: group('期初', 0) }),
      }),
    );

    const labels = flatten(rows).map((row) => row.label);
    expect(labels).not.toContain('資產');
    expect(labels).toContain('權益');
    expect(labels).toContain('期初');
  });

  it('sums liabilities and equity into the 負債 + 權益 terminus', () => {
    const rows = buildBalanceSheetRows(
      balanceVM({ liabilities: side(40000, {}), equity: side(60000, {}) }),
    );

    expect(rows.at(-1)).toMatchObject({
      label: '負債 + 權益',
      tone: 'terminus',
      amountText: formatCurrency(100000),
    });
  });
});

describe('buildCashFlowRows', () => {
  it('sums each bucket from its items and omits empty buckets', () => {
    const rows = buildCashFlowRows(
      cashFlowVM({
        operating: cashFlowGroup(7000, {
          inflowItems: [item('A', '股息', 10000)],
          outflowItems: [item('B', '手續費', 3000)],
        }),
      }),
    );

    const flat = flatten(rows);
    const inflow = flat.find((row) => row.label === '流入');
    const outflow = flat.find((row) => row.label === '流出');
    expect(inflow).toMatchObject({ amountText: formatCurrency(10000) });
    expect(outflow).toMatchObject({ amountText: formatCurrency(3000) });
    expect(rows.at(-1)).toMatchObject({ label: '現金淨變動', tone: 'terminus' });
  });

  it('scopes bucket keys per activity so inflow/outflow codes never collide', () => {
    const rows = buildCashFlowRows(
      cashFlowVM({
        operating: cashFlowGroup(1, { inflowItems: [item('X', '收', 1)] }),
        investing: cashFlowGroup(1, { inflowItems: [item('X', '收', 1)] }),
      }),
    );

    const keys = flatten(rows).map((row) => row.key);
    expect(keys).toContain('operating:inflow');
    expect(keys).toContain('investing:inflow');
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('omits an activity with no total and no items', () => {
    const rows = buildCashFlowRows(cashFlowVM());

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ label: '現金淨變動' });
  });
});
