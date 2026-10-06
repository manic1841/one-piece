import { describe, expect, it } from 'vitest';

import {
  buildReportHistoryVM,
  formatReportPeriodDisplay,
  parseReportPeriod,
  stepReportPeriod,
} from './reportHistory.vm';

const income = (yearMonth: string, netIncome: number) => ({
  id: `${yearMonth}-INCOME_STATEMENT`,
  householdId: 'h1',
  yearMonth,
  type: 'INCOME_STATEMENT' as const,
  data: {
    yearMonth,
    incomeTotal: netIncome,
    expenseTotal: 0,
    netIncome,
    incomeItems: [],
    expenseItems: [],
  },
});
const balance = (yearMonth: string, equity: number) => ({
  id: `${yearMonth}-BALANCE_SHEET`,
  householdId: 'h1',
  yearMonth,
  type: 'BALANCE_SHEET' as const,
  data: {
    yearMonth,
    assets: { total: equity, groups: {} },
    liabilities: { total: 0, groups: {} },
    equity: { total: equity, groups: {} },
  },
});
const cash = (yearMonth: string, actualBalance: number) => ({
  id: `${yearMonth}-CASH_FLOW`,
  householdId: 'h1',
  yearMonth,
  type: 'CASH_FLOW' as const,
  data: {
    yearMonth,
    operating: { label: '營業活動', total: 0, inflowItems: [], outflowItems: [] },
    investing: { label: '投資活動', total: 0, inflowItems: [], outflowItems: [] },
    financing: { label: '籌資活動', total: 0, inflowItems: [], outflowItems: [] },
    netCashChange: 0,
    beginningBalance: 0,
    endingBalance: actualBalance,
    actualBalance,
    adjustment: 0,
  },
});
const period = (yearMonth: string, status: 'IN_PROGRESS' | 'NEEDS_REVIEW' | 'CLOSED') => ({
  yearMonth,
  status,
});

describe('parseReportPeriod', () => {
  it('distinguishes a year from a month by length', () => {
    expect(parseReportPeriod('2026')).toMatchObject({ mode: 'YEARLY', year: 2026, month: null });
    expect(parseReportPeriod('2026-06')).toMatchObject({ mode: 'MONTHLY', year: 2026, month: 6 });
  });

  it('rejects malformed periods', () => {
    expect(parseReportPeriod('26')).toBeNull();
    expect(parseReportPeriod('2026-13')).toBeNull();
    expect(parseReportPeriod(undefined)).toBeNull();
  });
});

describe('stepReportPeriod', () => {
  it('moves one calendar month at a time, rolling over the year', () => {
    expect(stepReportPeriod(parseReportPeriod('2026-01')!, -1)).toBe('2025-12');
    expect(stepReportPeriod(parseReportPeriod('2026-12')!, 1)).toBe('2027-01');
  });

  it('moves one year at a time in year mode', () => {
    expect(stepReportPeriod(parseReportPeriod('2026')!, -1)).toBe('2025');
  });
});

describe('formatReportPeriodDisplay', () => {
  it('renders a month and a year distinctly', () => {
    expect(formatReportPeriodDisplay(parseReportPeriod('2026-06')!)).toBe('2026 年 6 月');
    expect(formatReportPeriodDisplay(parseReportPeriod('2026')!)).toBe('2026 年');
  });
});

describe('buildReportHistoryVM', () => {
  it('lists months as the union of reports and periods, newest first', () => {
    const vm = buildReportHistoryVM(
      [income('2026-05', 30000), income('2026-06', 50000)],
      [period('2026-04', 'CLOSED')],
      'MONTHLY',
    );

    expect(vm.rows.map((row) => row.period)).toEqual(['2026-06', '2026-05', '2026-04']);
  });

  it('aggregates a year: nets sum, equity and cash take the last report', () => {
    const vm = buildReportHistoryVM(
      [
        income('2026-05', 30000),
        balance('2026-05', 150000),
        cash('2026-05', 60000),
        income('2026-06', 50000),
        balance('2026-06', 200000),
        cash('2026-06', 80000),
      ],
      [],
      'YEARLY',
    );

    expect(vm.rows).toHaveLength(1);
    expect(vm.rows[0]).toMatchObject({
      period: '2026',
      netIncomeText: 'NT$80,000',
      equityText: 'NT$200,000',
      endingCashText: 'NT$80,000',
      status: null,
    });
  });

  it('shows a status badge for every month that is not closed, and none for closed', () => {
    const vm = buildReportHistoryVM(
      [income('2026-05', 30000), income('2026-06', 50000)],
      [period('2026-05', 'CLOSED'), period('2026-06', 'IN_PROGRESS')],
      'MONTHLY',
    );

    const byPeriod = Object.fromEntries(vm.rows.map((row) => [row.period, row.status]));
    expect(byPeriod['2026-05']).toBeNull();
    expect(byPeriod['2026-06']).toMatchObject({ text: 'IN PROGRESS' });
  });

  it('uses the most recent month with a report as the hero', () => {
    const vm = buildReportHistoryVM(
      [income('2026-05', 30000), income('2026-06', 50000)],
      [],
      'MONTHLY',
    );

    expect(vm.latest).toMatchObject({ period: '2026-06', netIncomeText: 'NT$50,000' });
  });
});
