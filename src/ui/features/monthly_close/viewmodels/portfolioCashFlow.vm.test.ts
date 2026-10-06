import { describe, expect, it } from 'vitest';

import type { PortfolioSnapshot } from '@/domains/portfolio/types/portfolio';

import {
  buildPortfolioCashFlowSections,
  buildPortfolioCashFlowTotal,
} from './portfolioCashFlow.vm';

const snapshotOf = (overrides: { deposits?: number; withdrawals?: number }): PortfolioSnapshot => ({
  id: 's1',
  portfolioId: 'p1',
  year: 2026,
  month: 9,
  accounts: [],
  totalValue: 0,
  cashFlow: { deposits: overrides.deposits ?? 0, withdrawals: overrides.withdrawals ?? 0 },
  performance: {
    openingValue: 0,
    closingValue: 0,
    netCashFlow: (overrides.deposits ?? 0) - (overrides.withdrawals ?? 0),
    gain: 0,
    returnRate: 0,
    cumulativeGain: 0,
    cumulativeReturnRate: 0,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'user-1',
  updatedBy: 'user-1',
});

describe('buildPortfolioCashFlowSections', () => {
  it('shows the live account balances and derives the return from the opening value', () => {
    const sections = buildPortfolioCashFlowSections({
      portfolios: [{ id: 'p1', name: 'Investment A' }],
      snapshots: new Map([['p1', snapshotOf({ deposits: 100_000, withdrawals: 30_000 })]]),
      balances: { p1: { securities: 1_000_000, bank: 280_000 } },
      openingValues: { p1: 1_200_000 },
      portfolioCashFlows: {},
    });

    expect(sections[0].portfolioName).toBe('Investment A');
    expect(sections[0].securitiesBalanceText).toBe('NT$1,000,000');
    expect(sections[0].bankBalanceText).toBe('NT$280,000');
    expect(sections[0].deposits).toBe(100_000);
    expect(sections[0].withdrawals).toBe(30_000);
    expect(sections[0].netCashFlow).toBe(70_000);
    expect(sections[0].openingValue).toBe(1_200_000);
    // gain = closing(1_280_000) - opening(1_200_000) - netCashFlow(70_000); Dietz base = 1_200_000 + 35_000
    expect(sections[0].gain).toBe(10_000);
    expect(sections[0].gainText).toBe('NT$10,000');
    expect(sections[0].returnRate).toBeCloseTo((10_000 / 1_235_000) * 100, 10);
  });

  it('lets in-progress typed inputs win over the snapshot cash flow and recompute return', () => {
    const sections = buildPortfolioCashFlowSections({
      portfolios: [{ id: 'p1', name: 'Investment A' }],
      snapshots: new Map([['p1', snapshotOf({ deposits: 100_000, withdrawals: 30_000 })]]),
      balances: { p1: { securities: 0, bank: 0 } },
      openingValues: {},
      portfolioCashFlows: { p1: { deposits: 200_000, withdrawals: 0 } },
    });

    expect(sections[0].deposits).toBe(200_000);
    expect(sections[0].withdrawals).toBe(0);
    expect(sections[0].netCashFlow).toBe(200_000);
    // gain = closing(0) - opening(0) - netCashFlow(200_000); Dietz base = 100_000
    expect(sections[0].gain).toBe(-200_000);
    expect(sections[0].returnRate).toBe(-200);
  });

  it('returns null balances and zero performance when no account snapshot exists', () => {
    const sections = buildPortfolioCashFlowSections({
      portfolios: [{ id: 'p1', name: 'Investment A' }],
      snapshots: new Map([['p1', null]]),
      balances: { p1: { securities: null, bank: null } },
      openingValues: {},
      portfolioCashFlows: {},
    });

    expect(sections[0].securitiesBalanceText).toBe('—');
    expect(sections[0].bankBalanceText).toBe('—');
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
        securitiesBalanceText: 'NT$1,000,000',
        bankBalanceText: 'NT$280,000',
        deposits: undefined,
        withdrawals: undefined,
        netCashFlow: 70_000,
        openingValue: 1_210_000,
        gain: 35_000,
        gainText: 'NT$35,000',
        returnRate: 2.8,
        returnRateText: '2.80%',
      },
      {
        portfolioId: 'p2',
        portfolioName: 'B',
        securitiesBalanceText: 'NT$500,000',
        bankBalanceText: 'NT$0',
        deposits: undefined,
        withdrawals: undefined,
        netCashFlow: 0,
        openingValue: 500_000,
        gain: 10_000,
        gainText: 'NT$10,000',
        returnRate: 2,
        returnRateText: '2.00%',
      },
    ];

    const total = buildPortfolioCashFlowTotal(sections);

    // Σgain / Σ(openingValue + netCashFlow/2), from the domain calculator path
    expect(total.gain).toBe(45_000);
    expect(total.gainText).toBe('NT$45,000');
    expect(total.returnRate).toBeCloseTo((45_000 / (1_245_000 + 500_000)) * 100, 10);
    expect(total.returnRateText).toBe('2.58%');
  });

  it('returns zero for an empty section list', () => {
    const total = buildPortfolioCashFlowTotal([]);

    expect(total.gain).toBe(0);
    expect(total.gainText).toBe('NT$0');
    expect(total.returnRate).toBe(0);
    expect(total.returnRateText).toBe('0.00%');
  });
});
