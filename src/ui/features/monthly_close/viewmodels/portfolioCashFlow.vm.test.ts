import { describe, expect, it } from 'vitest';

import type { PortfolioSnapshot } from '@/domains/portfolio/types/portfolio';

import {
  buildPortfolioCashFlowSections,
  buildPortfolioCashFlowTotal,
} from './portfolioCashFlow.vm';

const snapshotOf = (overrides: {
  securitiesValue?: number;
  bankValue?: number;
  gain?: number;
  returnRate?: number;
  deposits?: number;
  withdrawals?: number;
}): PortfolioSnapshot => ({
  id: 's1',
  portfolioId: 'p1',
  year: 2026,
  month: 9,
  accounts: [
    {
      accountId: 'sec-1',
      accountName: '證券',
      category: 'securities',
      value: overrides.securitiesValue ?? 0,
      holdings: [],
    },
    {
      accountId: 'bank-1',
      accountName: '銀行',
      category: 'bank',
      value: overrides.bankValue ?? 0,
      holdings: [],
    },
  ],
  totalValue: (overrides.securitiesValue ?? 0) + (overrides.bankValue ?? 0),
  cashFlow: { deposits: overrides.deposits ?? 0, withdrawals: overrides.withdrawals ?? 0 },
  performance: {
    openingValue: 0,
    closingValue: (overrides.securitiesValue ?? 0) + (overrides.bankValue ?? 0),
    netCashFlow: (overrides.deposits ?? 0) - (overrides.withdrawals ?? 0),
    gain: overrides.gain ?? 0,
    returnRate: overrides.returnRate ?? 0,
    cumulativeGain: overrides.gain ?? 0,
    cumulativeReturnRate: overrides.returnRate ?? 0,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'user-1',
  updatedBy: 'user-1',
});

describe('buildPortfolioCashFlowSections', () => {
  it('prefills deposits, withdrawals, balances and performance from the snapshot', () => {
    const sections = buildPortfolioCashFlowSections({
      portfolios: [{ id: 'p1', name: 'Investment A' }],
      snapshots: new Map([
        [
          'p1',
          snapshotOf({
            securitiesValue: 1_000_000,
            bankValue: 280_000,
            gain: 35_000,
            returnRate: 2.8,
            deposits: 100_000,
            withdrawals: 30_000,
          }),
        ],
      ]),
      portfolioCashFlows: {},
    });

    expect(sections[0].portfolioName).toBe('Investment A');
    expect(sections[0].securitiesBalance).toBe(1_000_000);
    expect(sections[0].bankBalance).toBe(280_000);
    expect(sections[0].deposits).toBe(100_000);
    expect(sections[0].withdrawals).toBe(30_000);
    expect(sections[0].netCashFlow).toBe(70_000);
    // Derived live from balances: gain = 1_280_000 - 0 - 70_000; Dietz base = 0 + 35_000
    expect(sections[0].gain).toBe(1_210_000);
    expect(sections[0].returnRate).toBeCloseTo((1_210_000 / 35_000) * 100, 10);
  });

  it('lets in-progress typed inputs win over the snapshot cash flow and recompute return', () => {
    const sections = buildPortfolioCashFlowSections({
      portfolios: [{ id: 'p1', name: 'Investment A' }],
      snapshots: new Map([
        [
          'p1',
          snapshotOf({ deposits: 100_000, withdrawals: 30_000, gain: 35_000, returnRate: 2.8 }),
        ],
      ]),
      portfolioCashFlows: { p1: { deposits: 200_000, withdrawals: 0 } },
    });

    expect(sections[0].deposits).toBe(200_000);
    expect(sections[0].withdrawals).toBe(0);
    expect(sections[0].netCashFlow).toBe(200_000);
    // gain = closing(0) - opening(0) - netCashFlow(200_000); Dietz base = 100_000
    expect(sections[0].gain).toBe(-200_000);
    expect(sections[0].returnRate).toBe(-200);
  });

  it('returns null balances and zero performance for a missing snapshot', () => {
    const sections = buildPortfolioCashFlowSections({
      portfolios: [{ id: 'p1', name: 'Investment A' }],
      snapshots: new Map([['p1', null]]),
      portfolioCashFlows: {},
    });

    expect(sections[0].securitiesBalance).toBeNull();
    expect(sections[0].bankBalance).toBeNull();
    expect(sections[0].gain).toBe(0);
    expect(sections[0].returnRate).toBe(0);
  });
});

describe('buildPortfolioCashFlowTotal', () => {
  it('matches the domain calculator for identical inputs', () => {
    const sections = [
      {
        portfolioId: 'p1',
        portfolioName: 'A',
        securitiesBalance: 1_000_000,
        bankBalance: 280_000,
        deposits: undefined,
        withdrawals: undefined,
        netCashFlow: 70_000,
        openingValue: 1_210_000,
        gain: 35_000,
        returnRate: 2.8,
      },
      {
        portfolioId: 'p2',
        portfolioName: 'B',
        securitiesBalance: 500_000,
        bankBalance: 0,
        deposits: undefined,
        withdrawals: undefined,
        netCashFlow: 0,
        openingValue: 500_000,
        gain: 10_000,
        returnRate: 2,
      },
    ];

    const total = buildPortfolioCashFlowTotal(sections);

    // Σgain / Σ(openingValue + netCashFlow/2), from the domain calculator path
    expect(total.gain).toBe(45_000);
    expect(total.returnRate).toBeCloseTo((45_000 / (1_245_000 + 500_000)) * 100, 10);
  });

  it('returns zero for an empty section list', () => {
    const total = buildPortfolioCashFlowTotal([]);

    expect(total.gain).toBe(0);
    expect(total.returnRate).toBe(0);
  });
});
