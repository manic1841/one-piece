import { format, subMonths } from 'date-fns';
import { limit } from 'firebase/firestore';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type Account } from '@/domains/account/types/account';
import {
  type BalanceSheetData,
  type CashFlowData,
  type IncomeStatementData,
  ReportType,
} from '@/domains/report/schemas';
import {
  type ReportLabelResolver,
  calculateBalanceSheet,
  calculateCashFlow,
  calculateIncomeStatement,
} from '@/domains/report/reportCalculations';
import { accountRepository } from '@/infra/repositories/accountRepository';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';
import { portfolioRepository } from '@/infra/repositories/portfolioRepository';
import { portfolioSnapshotRepository } from '@/infra/repositories/portfolioSnapshotRepository';
import { reportRepository } from '@/infra/repositories/reportRepository';

export interface PreviewFinancialReportsRequest {
  householdId: string;
  auth: AuthContext;
  year: number;
  month: number;
  labelResolver?: ReportLabelResolver;
}

export interface ReportTimestamps {
  incomeStatement?: string;
  balanceSheet?: string;
  cashFlow?: string;
}

export interface PreviewFinancialReportsResult {
  incomeStatement: IncomeStatementData;
  balanceSheet: BalanceSheetData;
  cashFlow: CashFlowData;
  isPersisted: boolean;
  timestamps: ReportTimestamps;
}

export class PreviewFinancialReportsUseCase {
  async execute(
    request: PreviewFinancialReportsRequest,
  ): Promise<PreviewFinancialReportsResult> {
    const { householdId, auth, year, month, labelResolver } = request;
    const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    // Fetch all data needed for calculations
    const [entriesByMonth, entriesUntilMonth, accounts, portfolios, debtAccounts] =
      await Promise.all([
        reportRepository.getEntriesByMonth(householdId, yearMonth),
        reportRepository.getEntriesUntilMonth(householdId, yearMonth),
        accountRepository.getAccounts(householdId),
        portfolioRepository.list([householdId]),
        debtAccountRepository.getDebtAccounts(householdId),
      ]);

    // Income statement
    const incomeStatement = calculateIncomeStatement({ yearMonth, entries: entriesByMonth, labelResolver });

    // Fetch snapshots needed for balance sheet
    const activeAccounts = accounts.filter((a) => a.isActive);
    const activePortfolios = portfolios.filter((p) => p.isActive);
    const activeDebts = debtAccounts.filter((d) => d.isActive);

    const [accountSnapshots, debtSnapshots, portfolioSnapshots] = await Promise.all([
      Promise.all(
        activeAccounts.map(async (account) => {
          const snapshot = await accountRepository.getSnapshot(householdId, account.id, yearMonth);
          return { accountId: account.id, amount: snapshot?.amount || 0 };
        }),
      ),
      Promise.all(
        activeDebts.map(async (debt) => {
          const snapshot = await debtSnapshotRepository.getSnapshot(householdId, debt.id, yearMonth);
          return { debtId: debt.id, closingBalance: snapshot?.closingBalance || 0 };
        }),
      ),
      Promise.all(
        activePortfolios.map(async (portfolio) => {
          const snapshot = await portfolioSnapshotRepository.getSnapshot(
            householdId,
            portfolio.id,
            yearMonth,
          );
          return { portfolioId: portfolio.id, gain: snapshot?.performance?.gain || 0 };
        }),
      ),
    ]);

    // Previous month balance sheet for opening equity
    const [yearNum, monthNum] = yearMonth.split('-').map(Number);
    const prevMonthDate = subMonths(new Date(yearNum, monthNum - 1, 1), 1);
    const prevYearMonth = format(prevMonthDate, 'yyyy-MM');
    const prevBalanceSheetReport = await reportRepository.getReport(
      householdId,
      prevYearMonth,
      ReportType.BALANCE_SHEET,
    );
    const prevBalanceSheet = prevBalanceSheetReport
      ? (prevBalanceSheetReport.data as BalanceSheetData)
      : null;

    // Balance sheet
    const balanceSheet = calculateBalanceSheet({
      yearMonth,
      entries: entriesUntilMonth,
      monthlyEntries: entriesByMonth,
      accounts: activeAccounts.map((a) => ({ id: a.id, name: a.name, category: a.category })),
      portfolios: activePortfolios.map((p) => ({ id: p.id, name: p.name })),
      debtAccounts: activeDebts.map((d) => ({ id: d.id, name: d.name })),
      accountSnapshots,
      debtSnapshots,
      portfolioSnapshots,
      prevBalanceSheet,
      incomeStatement,
      labelResolver,
    });

    // Cash flow: need beginning balance and actual balance
    const prevCashFlowReport = await reportRepository.getReport(
      householdId,
      prevYearMonth,
      ReportType.CASH_FLOW,
    );
    let beginningBalance = 0;
    if (prevCashFlowReport?.data) {
      beginningBalance = (prevCashFlowReport.data as CashFlowData).actualBalance;
    } else {
      const existingReports = await reportRepository.list([householdId], [limit(1)]);
      if (existingReports.length > 0) {
        beginningBalance = await this.getLiquidBalance(householdId, prevYearMonth, accounts);
      }
    }

    const actualBalance = await this.getLiquidBalance(householdId, yearMonth, accounts);

    const cashFlow = calculateCashFlow({
      yearMonth,
      entries: entriesByMonth,
      beginningBalance,
      actualBalance,
      labelResolver,
    });

    // Check persistence state
    const existingReports = await Promise.all([
      reportRepository.getReport(householdId, yearMonth, ReportType.INCOME_STATEMENT),
      reportRepository.getReport(householdId, yearMonth, ReportType.BALANCE_SHEET),
      reportRepository.getReport(householdId, yearMonth, ReportType.CASH_FLOW),
    ]);

    const allPersisted = existingReports.every((report) => report !== null);
    const timestamps: ReportTimestamps = {};
    if (allPersisted) {
      timestamps.incomeStatement = format(existingReports[0]!.updatedAt, 'HH:mm');
      timestamps.balanceSheet = format(existingReports[1]!.updatedAt, 'HH:mm');
      timestamps.cashFlow = format(existingReports[2]!.updatedAt, 'HH:mm');
    }

    return {
      incomeStatement,
      balanceSheet,
      cashFlow,
      isPersisted: allPersisted,
      timestamps,
    };
  }

  private async getLiquidBalance(
    householdId: string,
    yearMonth: string,
    accounts: Account[],
  ): Promise<number> {
    let total = 0;
    for (const account of accounts) {
      if (account.category === 'bank' || account.category === 'cash') {
        const snapshot = await accountRepository.getSnapshot(householdId, account.id, yearMonth);
        total += snapshot?.amount || 0;
      }
    }
    return total;
  }
}

export const previewFinancialReportsUseCase = new PreviewFinancialReportsUseCase();
