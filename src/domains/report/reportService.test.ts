import { beforeEach, describe, expect, it, vi } from 'vitest';

import { accountRepository } from '@/infra/repositories/accountRepository';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';
import { portfolioRepository } from '@/infra/repositories/portfolioRepository';
import { portfolioSnapshotRepository } from '@/infra/repositories/portfolioSnapshotRepository';
import { reportRepository } from '@/infra/repositories/reportRepository';

import { reportService } from './reportService';
import { ReportType } from './schemas';

vi.mock('@/infra/repositories/reportRepository', () => ({
  reportRepository: {
    getEntriesByMonth: vi.fn(),
    getEntriesUntilMonth: vi.fn(),
    getReport: vi.fn(),
    list: vi.fn(),
    saveReport: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/accountRepository', () => ({
  accountRepository: {
    getAccounts: vi.fn(),
    getSnapshot: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/portfolioRepository', () => ({
  portfolioRepository: {
    list: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/portfolioSnapshotRepository', () => ({
  portfolioSnapshotRepository: {
    get: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/debtAccountRepository', () => ({
  debtAccountRepository: {
    getDebtAccounts: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/debtSnapshotRepository', () => ({
  debtSnapshotRepository: {
    getSnapshot: vi.fn(),
  },
}));

describe('ReportService', () => {
  const householdId = 'h1';
  const yearMonth = '2026-03';
  const userEmail = 'test@example.com';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateIncomeStatement', () => {
    it('should calculate revenue and expenses correctly', async () => {
      // Mock entries: Salary income and Living expenses
      const mockEntries = [
        { ledgerCode: 'income:salary', debit: 0, credit: 50000 },
        { ledgerCode: 'income:bonus', debit: 0, credit: 10000 },
        { ledgerCode: 'expense:food', debit: 15000, credit: 0 },
        { ledgerCode: 'expense:rent', debit: 20000, credit: 0 },
      ];
      vi.mocked(reportRepository.getEntriesByMonth).mockResolvedValue(mockEntries as any);

      const result = await reportService.generateIncomeStatement(householdId, yearMonth);

      expect(result.incomeTotal).toBe(60000); // 50000 + 10000
      expect(result.expenseTotal).toBe(35000); // 15000 + 20000
      expect(result.netIncome).toBe(25000);
      expect(result.incomeItems).toHaveLength(2);
      expect(result.expenseItems).toHaveLength(2);
    });

    it('should keep salary and bonus sub-ledger codes as separate items', async () => {
      const mockEntries = [
        { ledgerCode: 'income:salary', debit: 0, credit: 30000 },
        { ledgerCode: 'income:salary:charles', debit: 0, credit: 20000 },
        { ledgerCode: 'income:bonus', debit: 0, credit: 8000 },
        { ledgerCode: 'income:bonus:charles', debit: 0, credit: 2000 },
      ];
      vi.mocked(reportRepository.getEntriesByMonth).mockResolvedValue(mockEntries as any);

      const result = await reportService.generateIncomeStatement(householdId, yearMonth);

      expect(result.incomeItems.map((item) => item.code)).toEqual([
        'income:salary',
        'income:salary:charles',
        'income:bonus',
        'income:bonus:charles',
      ]);
      expect(result.incomeTotal).toBe(60000);
    });
  });

  describe('generateBalanceSheet', () => {
    it('should calculate assets, liabilities, and equity with complex data', async () => {
      // 1. Assets: Cash & Investment
      const mockedAccount = [
        { id: 'acc1', name: 'Chase Bank', category: 'bank' } as any,
        { id: 'acc2', name: 'Securities', category: 'securities' } as any,
      ];
      vi.mocked(accountRepository.getAccounts).mockResolvedValue(mockedAccount);
      vi.mocked(accountRepository.getSnapshot).mockResolvedValue({ amount: 100000 } as any);

      // 3. Assets: Property (Buying a house: 10,000,000)
      const mockUntilEntries = [{ ledgerCode: 'asset:property:house', debit: 10000000, credit: 0 }];
      vi.mocked(reportRepository.getEntriesUntilMonth).mockResolvedValue(mockUntilEntries as any);

      // 4. Liabilities: Mortgage
      vi.mocked(debtAccountRepository.getDebtAccounts).mockResolvedValue([
        { id: 'debt1', name: 'Mortgage' } as any,
      ]);
      vi.mocked(debtSnapshotRepository.getSnapshot).mockResolvedValue({
        closingBalance: 8000000,
      } as any);

      // 5. Equity logic mocks
      // 5.1 Previous report for openingEquity (not found, fallback to equity:opening)
      vi.mocked(reportRepository.getReport).mockResolvedValue(null);

      // 5.2 Equity entries
      const mockEquityEntries = [
        { ledgerCode: 'equity:capital', debit: 10000, credit: 0 }, // Financing outflow
        { ledgerCode: 'equity:capital', debit: 0, credit: 20000 }, // Financing inflow
      ];
      vi.mocked(reportRepository.getEntriesUntilMonth).mockResolvedValue([
        ...mockUntilEntries,
        ...mockEquityEntries,
      ] as any);

      // 5.3 netIncome mock (current month entries)
      const currentMonthEntries = [
        { ledgerCode: 'income:salary', debit: 0, credit: 50000 },
        { ledgerCode: 'equity:capital', debit: 10000, credit: 0 },
        { ledgerCode: 'equity:capital', debit: 0, credit: 20000 },
      ];
      vi.mocked(reportRepository.getEntriesByMonth).mockResolvedValue(currentMonthEntries as any);

      // 5.4 Investment Gain (from portfolio)
      vi.mocked(portfolioRepository.list).mockResolvedValue([
        { id: 'port1', name: 'Stocks' } as any,
      ]);
      vi.mocked(portfolioSnapshotRepository.get).mockResolvedValue({
        performance: { cumulativeGain: 500000 },
      } as any);

      const result = await reportService.generateBalanceSheet(householdId, yearMonth);

      // Assets: 100,000 (Cash) + 100,000 (Investment) + 10,000,000 (Property) = 10,200,000
      expect(result.assets.total).toBe(10200000);

      // Liabilities: 8,000,000 (Loan) = 8,000,000
      expect(result.liabilities.total).toBe(8000000);

      // Equity total: 10,200,000 - 8,000,000 = 2,200,000
      expect(result.equity.total).toBe(2200000);

      // Opening Equity (Fallback to 0 if no entries/report)
      expect(result.equity.groups.openingEquity.total).toBe(0);

      // Capital
      expect(result.equity.groups.capital.total).toBe(10000);

      // Net Income (from currentMonthEntries salary)
      expect(result.equity.groups.netIncome.total).toBe(50000);

      // Stock Gain
      expect(result.equity.groups.stock_gain.total).toBe(500000);

      // Adjustment check: 2,200,000 - 50,000 - 0 - 10,000 - 500,000 = 1,640,000
      expect(result.equity.groups.adjustment.total).toBe(1640000);
    });
  });

  describe('generateCashFlow', () => {
    it('should categorize operating, investing, and financing activities correctly and reconcile', async () => {
      const mockMonthEntries = [
        // Operating
        { ledgerCode: 'income:salary', debit: 0, credit: 50000 },
        { ledgerCode: 'expense:food', debit: 10000, credit: 0 },
        // Investing (Investment purchase)
        { ledgerCode: 'asset:investment:stocks', debit: 20000, credit: 0 },
        // Financing (Mortgage repayment: principal 15,000)
        { ledgerCode: 'liability:mortgage', debit: 15000, credit: 0 },
      ];
      vi.mocked(reportRepository.getEntriesByMonth).mockResolvedValue(mockMonthEntries as any);

      // Beginning balance logic: Month is March, so it looks for Feb snapshot
      vi.mocked(accountRepository.getAccounts).mockResolvedValue([
        { id: 'acc1', name: 'Cash', category: 'cash' } as any,
      ]);
      vi.mocked(accountRepository.getSnapshot).mockImplementation((hid, aid, ym) => {
        if (ym === '2026-02') return Promise.resolve({ amount: 100000 } as any); // Beginning
        if (ym === '2026-03') return Promise.resolve({ amount: 102000 } as any); // Actual Ending
        return Promise.resolve(null);
      });
      vi.mocked(reportRepository.getReport).mockResolvedValue(null);
      vi.mocked(reportRepository.list).mockResolvedValue([{ id: 'r1' } as any]);

      const result = await reportService.generateCashFlow(householdId, yearMonth);

      // Operating: 50,000 (Inflow) - 10,000 (Outflow) = 40,000
      expect(result.operating.total).toBe(40000);

      // Investing: 20,000 (Outflow)
      expect(result.investing.total).toBe(-20000);

      // Financing: 15,000 (Outflow)
      expect(result.financing.total).toBe(-15000);

      expect(result.netCashChange).toBe(5000); // 40,000 - 20,000 - 15,000
      expect(result.beginningBalance).toBe(100000);
      expect(result.endingBalance).toBe(105000);

      // Actual Balance (from current month snapshot)
      expect(result.actualBalance).toBe(102000);

      // Adjustment: 102,000 - 105,000 = -3000
      expect(result.adjustment).toBe(-3000);
    });
  });
});
