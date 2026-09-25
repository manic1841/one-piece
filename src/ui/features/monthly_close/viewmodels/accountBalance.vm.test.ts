import { describe, expect, it } from 'vitest';

import type { AccountBalanceInput } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import type { Account } from '@/domains/account/types/account';
import type { AccountSnapshot } from '@/domains/account/types/account';

import {
  buildAccountBalanceSections,
  computeSectionInput,
  upsertSectionInput,
} from './accountBalance.vm';

const account = (overrides: Partial<Account> & { id: string; name: string }): Account =>
  ({
    category: 'cash',
    currency: 'TWD',
    order: 0,
    isActive: true,
    createdBy: 'u1',
    updatedBy: 'u1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Account;

const snapshot = (
  overrides: Partial<AccountSnapshot> & { id: string; accountId: string },
): AccountSnapshot =>
  ({
    year: 2026,
    month: 8,
    amount: 50000,
    createdBy: 'u1',
    updatedBy: 'u1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as AccountSnapshot;

const input = (
  overrides: Partial<AccountBalanceInput> & { accountId: string },
): AccountBalanceInput => ({
  amount: 0,
  ...overrides,
});

describe('buildAccountBalanceSections', () => {
  it('maps TWD cash and bank accounts into the twd section', () => {
    const sections = buildAccountBalanceSections({
      accounts: [
        account({ id: 'cash-1', name: '現金帳戶' }),
        account({ id: 'bank-1', name: '台新銀行', category: 'bank' }),
      ],
      snapshots: new Map(),
      stageCompleted: false,
    });

    expect(sections.map((section) => section.kind)).toEqual(['twd']);
    expect(sections[0].accounts.map((entry) => entry.account.name)).toEqual([
      '現金帳戶',
      '台新銀行',
    ]);
  });

  it('maps foreign-currency accounts into the foreign section regardless of category', () => {
    const sections = buildAccountBalanceSections({
      accounts: [account({ id: 'usd-1', name: 'USD Account', currency: 'USD' })],
      snapshots: new Map(),
      stageCompleted: false,
    });

    expect(sections.map((section) => section.kind)).toEqual(['foreign']);
  });

  it('maps securities accounts into the securities section before the currency rule', () => {
    const sections = buildAccountBalanceSections({
      accounts: [
        account({ id: 'sec-1', name: 'Securities Account', category: 'securities' }),
        account({
          id: 'sec-usd',
          name: 'USD Brokerage',
          category: 'securities',
          currency: 'USD',
        }),
      ],
      snapshots: new Map(),
      stageCompleted: false,
    });

    expect(sections.map((section) => section.kind)).toEqual(['securities']);
    expect(sections[0].accounts.map((entry) => entry.account.id)).toEqual(['sec-1', 'sec-usd']);
  });

  it('folds TWD other-category accounts into the twd section', () => {
    const sections = buildAccountBalanceSections({
      accounts: [account({ id: 'other-1', name: '其他', category: 'other' })],
      snapshots: new Map(),
      stageCompleted: false,
    });

    expect(sections.map((section) => section.kind)).toEqual(['twd']);
  });

  it('fills previous balance from the previous-month snapshot', () => {
    const sections = buildAccountBalanceSections({
      accounts: [account({ id: 'cash-1', name: '現金帳戶' })],
      snapshots: new Map([
        ['cash-1', snapshot({ id: '2026-08', accountId: 'cash-1', amount: 52000 })],
      ]),
    });

    expect(sections[0].accounts[0].previousBalance).toBe(52000);
  });

  it('exposes foreign previous balances as the foreign amount', () => {
    const sections = buildAccountBalanceSections({
      accounts: [account({ id: 'usd-1', name: 'USD Account', currency: 'USD' })],
      snapshots: new Map([
        [
          'usd-1',
          snapshot({
            id: '2026-08',
            accountId: 'usd-1',
            amount: 312500,
            originalAmount: 10000,
            exchangeRate: 31.25,
          }),
        ],
      ]),
    });

    expect(sections[0].accounts[0].previousBalance).toBe(10000);
  });

  it('derives per-account status from the stage state, not persisted data', () => {
    const sections = buildAccountBalanceSections({
      accounts: [account({ id: 'cash-1', name: '現金帳戶' })],
      snapshots: new Map(),
    });

    expect(sections[0].accounts[0].canImportPrevious).toBe(false);
  });

  it('flags import availability from previous-month holdings for securities', () => {
    const sections = buildAccountBalanceSections({
      accounts: [
        account({ id: 'sec-1', name: 'Securities Account', category: 'securities' }),
        account({ id: 'sec-2', name: 'Empty Brokerage', category: 'securities' }),
      ],
      snapshots: new Map([
        [
          'sec-1',
          snapshot({
            id: '2026-08',
            accountId: 'sec-1',
            amount: 710000,
            holdings: [
              { symbol: '2330', name: 'TSMC', cost: 620000, marketValue: 710000, leverage: 1 },
            ],
          }),
        ],
        ['sec-2', snapshot({ id: '2026-08', accountId: 'sec-2', amount: 0 })],
      ]),
    });

    expect(sections[0].accounts[0].canImportPrevious).toBe(true);
    expect(sections[0].accounts[1].canImportPrevious).toBe(false);
  });
});

describe('computeSectionInput', () => {
  it('converts foreign amount and rate into the TWD value', () => {
    const value = computeSectionInput(
      input({ accountId: 'usd-1', amount: 375000, originalAmount: 12000, exchangeRate: 31.25 }),
      'foreign',
    );

    expect(value).toBe(375000);
  });

  it('derives the foreign TWD value from the multiplication, not a stored amount', () => {
    const value = computeSectionInput(
      input({ accountId: 'usd-1', amount: 999, originalAmount: 12000, exchangeRate: 31.25 }),
      'foreign',
    );

    expect(value).toBe(375000);
  });

  it('sums holding market values for securities accounts', () => {
    const value = computeSectionInput(
      input({
        accountId: 'sec-1',
        amount: 1680000,
        holdings: [
          { symbol: '2330', name: 'TSMC', cost: 620000, marketValue: 710000, leverage: 1 },
          { symbol: '0050', name: 'ETF', cost: 500000, marketValue: 560000, leverage: 1 },
          { symbol: 'NVDA', name: 'NVIDIA', cost: 300000, marketValue: 410000, leverage: 1 },
        ],
      }),
      'securities',
    );

    expect(value).toBe(1680000);
  });

  it('multiplies holding market values by the rate for non-TWD securities accounts', () => {
    const value = computeSectionInput(
      input({
        accountId: 'sec-usd',
        amount: 1680000,
        exchangeRate: 31.25,
        holdings: [
          { symbol: 'NVDA', name: 'NVIDIA', cost: 300000, marketValue: 410000, leverage: 1 },
        ],
      }),
      'securities',
    );

    expect(value).toBe(12812500);
  });

  it('returns the raw amount for the twd section', () => {
    const value = computeSectionInput(input({ accountId: 'cash-1', amount: 52000 }), 'twd');

    expect(value).toBe(52000);
  });
});

describe('upsertSectionInput', () => {
  it('replaces the input for the account without touching other accounts', () => {
    const base = [input({ accountId: 'cash-1', amount: 52000 })];

    const next = upsertSectionInput(base, input({ accountId: 'bank-1', amount: 1250000 }), 'twd');

    expect(next).toHaveLength(2);
    expect(next.find((item) => item.accountId === 'cash-1')?.amount).toBe(52000);
    expect(next.find((item) => item.accountId === 'bank-1')?.amount).toBe(1250000);
  });

  it('keeps foreign details with the input', () => {
    const next = upsertSectionInput(
      [],
      input({ accountId: 'usd-1', amount: 375000, originalAmount: 12000, exchangeRate: 31.25 }),
      'foreign',
    );

    expect(next[0]).toEqual({
      accountId: 'usd-1',
      amount: 375000,
      originalAmount: 12000,
      exchangeRate: 31.25,
    });
  });

  it('keeps holdings with the input', () => {
    const holdings = [
      { symbol: '2330', name: 'TSMC', cost: 620000, marketValue: 710000, leverage: 1 },
    ];

    const next = upsertSectionInput(
      [],
      input({ accountId: 'sec-1', amount: 710000, holdings }),
      'securities',
    );

    expect(next[0].holdings).toEqual(holdings);
  });
});
