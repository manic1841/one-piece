import { describe, expect, it } from 'vitest';

import { previewCashFlowUseCase } from './previewCashFlowUseCase';
import { type ReportDataBundle } from './fetchReportDataUseCase';
import { type Account } from '@/domains/account/types/account';

const account = (id: string, category: string): Account => ({ id, category } as Account);

const bundle = (overrides: Partial<ReportDataBundle>): ReportDataBundle => ({
  yearMonth: '2025-06',
  prevYearMonth: '2025-05',
  entriesByMonth: [],
  entriesUntilMonth: [],
  activeAccounts: [],
  activePortfolios: [],
  activeDebts: [],
  accountSnapshots: [],
  debtSnapshots: [],
  portfolioSnapshots: [],
  prevAccountSnapshots: [],
  prevBalanceSheet: null,
  prevCashFlow: null,
  hasAnyStoredReport: false,
  ...overrides,
});

describe('PreviewCashFlowUseCase', () => {
  it('derives actualBalance from liquid account snapshots in bundle', () => {
    const result = previewCashFlowUseCase.execute(
      bundle({
        activeAccounts: [account('a1', 'bank'), account('a2', 'cash'), account('a3', 'securities')],
        accountSnapshots: [
          { accountId: 'a1', amount: 500 },
          { accountId: 'a2', amount: 1000 },
          { accountId: 'a3', amount: 9999 },
        ],
        entriesByMonth: [{ ledgerCode: 'income:salary', debit: 0, credit: 1000 }],
      }),
    );

    expect(result.yearMonth).toBe('2025-06');
    expect(result.actualBalance).toBe(1500);
    expect(result.beginningBalance).toBe(0);
    expect(result.endingBalance).toBe(result.beginningBalance + result.netCashChange);
  });

  it('uses prevCashFlow actualBalance as beginningBalance when available', () => {
    const result = previewCashFlowUseCase.execute(
      bundle({
        prevCashFlow: { actualBalance: 700 } as never,
      }),
    );

    expect(result.beginningBalance).toBe(700);
  });

  it('falls back to prev account snapshots when prevCashFlow missing but reports exist', () => {
    const result = previewCashFlowUseCase.execute(
      bundle({
        prevAccountSnapshots: [{ accountId: 'a1', amount: 300 }],
        activeAccounts: [account('a1', 'bank')],
        accountSnapshots: [{ accountId: 'a1', amount: 900 }],
        hasAnyStoredReport: true,
      }),
    );

    expect(result.beginningBalance).toBe(300);
    expect(result.actualBalance).toBe(900);
  });

  it('returns zero beginning balance when no prev report and no stored reports', () => {
    const result = previewCashFlowUseCase.execute(bundle({}));

    expect(result.beginningBalance).toBe(0);
    expect(result.netCashChange).toBe(0);
    expect(result.adjustment).toBe(0);
  });
});
