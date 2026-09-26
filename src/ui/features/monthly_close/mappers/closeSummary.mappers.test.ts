import { describe, expect, it } from 'vitest';

import { CLOSE_ACTIVITY_STATUS, mapCloseSummary, mapReadinessVM } from './closeSummary.mappers';

const readinessInput = {
  totalAccounts: 3,
  confirmedAccounts: 3,
  totalTransactions: 128,
  transactionIssues: [],
  totalSecurities: 6,
  totalPortfolios: 2,
  confirmedPortfolios: 2,
  totalProjects: 4,
  confirmedProjects: 4,
  totalDebts: 2,
  confirmedDebts: 2,
  zeroActivityNames: [] as string[],
  anomalies: [] as string[],
};

describe('mapReadinessVM', () => {
  it('marks all-checked data ready with zero exceptions', () => {
    const vm = mapReadinessVM(readinessInput);

    expect(vm.isReady).toBe(true);
    expect(vm.checks).toHaveLength(6);
    expect(vm.checks.every((check) => check.passed)).toBe(true);
    expect(vm.exceptions).toHaveLength(0);
  });

  it('derives check labels and N/M counts from the input', () => {
    const vm = mapReadinessVM(readinessInput);

    expect(vm.checks.map((check) => check.label)).toEqual([
      '帳戶餘額',
      '交易驗證',
      '證券買入／賣出',
      'Portfolio 金流',
      '專案結算',
      '債務還款',
    ]);
    expect(vm.checks[0].countText).toBe('3 / 3');
    expect(vm.checks[1].countText).toBe('128');
    expect(vm.checks[2].countText).toBe('6');
    expect(vm.checks[3].countText).toBe('2 / 2');
    expect(vm.checks[4].countText).toBe('4 / 4');
    expect(vm.checks[5].countText).toBe('2 / 2');
  });

  it('fails the transaction check when issues exist and lists them as exceptions', () => {
    const vm = mapReadinessVM({
      ...readinessInput,
      totalTransactions: 128,
      transactionIssues: [{ transactionId: 't1', description: '餐飲', reason: '分配不存在' }],
    });

    const transactionCheck = vm.checks.find((check) => check.label === '交易驗證');
    expect(transactionCheck?.passed).toBe(false);
    expect(vm.isReady).toBe(false);
    expect(vm.exceptions).toContainEqual({
      label: '交易驗證',
      detail: '餐飲：分配不存在',
      stageId: 'TRANSACTION_VALIDATION',
    });
  });

  it('fails snapshot checks with unconfirmed objects and routes to their stages', () => {
    const vm = mapReadinessVM({
      ...readinessInput,
      confirmedAccounts: 2,
      totalAccounts: 3,
      confirmedPortfolios: 1,
      totalPortfolios: 2,
    });

    expect(vm.isReady).toBe(false);
    expect(vm.exceptions).toEqual([
      expect.objectContaining({ label: '帳戶餘額', stageId: 'ACCOUNT_BALANCE' }),
      expect.objectContaining({ label: 'Portfolio 金流', stageId: 'PORTFOLIO_CASH_FLOW' }),
    ]);
  });

  it('lists zero-activity names as exceptions without blocking readiness', () => {
    const vm = mapReadinessVM({
      ...readinessInput,
      zeroActivityNames: ['台新銀行'],
    });

    expect(vm.isReady).toBe(true);
    expect(vm.exceptions).toEqual([
      { label: '零活動', detail: '台新銀行', stageId: 'COMPLETENESS_CHECK' },
    ]);
  });
});

const summaryInput = {
  yearMonth: '2026-09',
  stages: [
    { stageId: 'ACCOUNT_BALANCE', label: '帳戶餘額', isCompleted: true, dataText: '3 個帳戶' },
    {
      stageId: 'TRANSACTION_VALIDATION',
      label: '交易驗證',
      isCompleted: true,
      dataText: '128 筆交易',
    },
    { stageId: 'SECURITIES_TRADE', label: '證券買入／賣出', isCompleted: true, dataText: '6 筆' },
    {
      stageId: 'PORTFOLIO_CASH_FLOW',
      label: 'Portfolio 金流',
      isCompleted: false,
      dataText: null,
    },
    { stageId: 'PROJECT_SETTLEMENT', label: '專案結算', isCompleted: true, dataText: '4 個專案' },
    { stageId: 'DEBT_REPAYMENT', label: '債務還款', isCompleted: true, dataText: '2 筆' },
    {
      stageId: 'COMPLETENESS_CHECK',
      label: 'Completeness Check',
      isCompleted: true,
      dataText: null,
    },
    {
      stageId: 'FINANCIAL_REPORTS',
      label: 'Financial Reports',
      isCompleted: true,
      dataText: '3 張',
    },
    { stageId: 'CLOSE_PERIOD', label: 'Close Period', isCompleted: false, dataText: null },
  ],
  financialResult: {
    totalAssets: 10_500_000,
    totalLiabilities: 6_200_000,
    equity: 4_300_000,
    netIncome: 117_000,
    netCashFlow: 179_000,
  },
  reports: [
    { title: '損益表', isGenerated: true },
    { title: '資產負債表', isGenerated: true },
    { title: '現金流量表', isGenerated: false },
  ],
};

describe('mapCloseSummary', () => {
  it('builds close activity rows with idempotent order-independent results', () => {
    const vm = mapCloseSummary(summaryInput);

    expect(vm.activity).toHaveLength(9);
    expect(vm.activity[0]).toEqual({
      stepText: '01 帳戶餘額',
      status: CLOSE_ACTIVITY_STATUS.CONFIRMED,
      dataText: '3 個帳戶',
    });
    expect(vm.activity[3]).toEqual({
      stepText: '04 Portfolio 金流',
      status: CLOSE_ACTIVITY_STATUS.NOT_CONFIRMED,
      dataText: null,
    });
  });

  it('keeps the financial result as full numbers', () => {
    const vm = mapCloseSummary(summaryInput);

    expect(vm.financial).toEqual({
      totalAssets: 10_500_000,
      totalLiabilities: 6_200_000,
      equity: 4_300_000,
      netIncome: 117_000,
      netCashFlow: 179_000,
    });
  });

  it('marks missing reports as not generated', () => {
    const vm = mapCloseSummary(summaryInput);

    expect(vm.reports).toEqual([
      { title: '損益表', isGenerated: true },
      { title: '資產負債表', isGenerated: true },
      { title: '現金流量表', isGenerated: false },
    ]);
    expect(vm.reportsGeneratedCount).toBe(2);
  });

  it('reports the close stage as the finalization decision', () => {
    const vm = mapCloseSummary({
      ...summaryInput,
      stages: summaryInput.stages.map((stage) =>
        stage.stageId === 'CLOSE_PERIOD' ? { ...stage, isCompleted: true } : stage,
      ),
    });

    expect(vm.activity[8].status).toBe(CLOSE_ACTIVITY_STATUS.CLOSED);
  });
});
