import { format, subMonths } from 'date-fns';
import { limit } from 'firebase/firestore';

import { type Account } from '@/domains/account/types/account';
import { type DebtAccount } from '@/domains/debt/schemas';
import { type JournalEntryLine } from '@/domains/ledger/schemas';
import { type Portfolio } from '@/domains/portfolio/schemas';
import {
  type AccountSnapshotData,
  type DebtSnapshotData,
  type PortfolioSnapshotData,
} from '@/domains/report/reportCalculations';
import { type BalanceSheetData, type CashFlowData, ReportType } from '@/domains/report/schemas';
import { accountRepository } from '@/infra/repositories/accountRepository';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';
import { portfolioRepository } from '@/infra/repositories/portfolioRepository';
import { portfolioSnapshotRepository } from '@/infra/repositories/portfolioSnapshotRepository';
import { reportRepository } from '@/infra/repositories/reportRepository';

export interface ReportDataBundle {
  yearMonth: string;
  prevYearMonth: string;
  entriesByMonth: JournalEntryLine[];
  entriesUntilMonth: JournalEntryLine[];
  activeAccounts: Account[];
  activePortfolios: Portfolio[];
  activeDebts: DebtAccount[];
  accountSnapshots: AccountSnapshotData[];
  debtSnapshots: DebtSnapshotData[];
  portfolioSnapshots: PortfolioSnapshotData[];
  prevAccountSnapshots: AccountSnapshotData[];
  prevBalanceSheet: BalanceSheetData | null;
  prevCashFlow: CashFlowData | null;
  hasAnyStoredReport: boolean;
}

export interface FetchReportDataRequest {
  householdId: string;
  yearMonth: string;
}

export class FetchReportDataUseCase {
  async execute(request: FetchReportDataRequest): Promise<ReportDataBundle> {
    const { householdId, yearMonth } = request;
    const [yearNum, monthNum] = yearMonth.split('-').map(Number);
    const prevYearMonth = format(subMonths(new Date(yearNum, monthNum - 1, 1), 1), 'yyyy-MM');

    const [
      entriesByMonth,
      entriesUntilMonth,
      accounts,
      portfolios,
      debtAccounts,
      prevBalanceSheetReport,
      prevCashFlowReport,
    ] = await Promise.all([
      reportRepository.getEntriesByMonth(householdId, yearMonth),
      reportRepository.getEntriesUntilMonth(householdId, yearMonth),
      accountRepository.getAccounts(householdId),
      portfolioRepository.list([householdId]),
      debtAccountRepository.getDebtAccounts(householdId),
      reportRepository.getReport(householdId, prevYearMonth, ReportType.BALANCE_SHEET),
      reportRepository.getReport(householdId, prevYearMonth, ReportType.CASH_FLOW),
    ]);

    const activeAccounts = accounts.filter((a) => a.isActive);
    const activePortfolios = portfolios.filter((p) => p.isActive);
    const activeDebts = debtAccounts.filter((d) => d.isActive);

    const [accountSnapshots, debtSnapshots, portfolioSnapshots, prevAccountSnapshots] =
      await Promise.all([
        this.fetchAccountSnapshots(householdId, yearMonth, activeAccounts),
        this.fetchDebtSnapshots(householdId, yearMonth, activeDebts),
        this.fetchPortfolioSnapshots(householdId, yearMonth, activePortfolios),
        this.fetchAccountSnapshots(householdId, prevYearMonth, activeAccounts),
      ]);

    let hasAnyStoredReport = false;
    if (!prevCashFlowReport) {
      const existingReports = await reportRepository.list([householdId], [limit(1)]);
      hasAnyStoredReport = existingReports.length > 0;
    }

    return {
      yearMonth,
      prevYearMonth,
      entriesByMonth,
      entriesUntilMonth,
      activeAccounts,
      activePortfolios,
      activeDebts,
      accountSnapshots,
      debtSnapshots,
      portfolioSnapshots,
      prevAccountSnapshots,
      prevBalanceSheet: (prevBalanceSheetReport?.data as BalanceSheetData) ?? null,
      prevCashFlow: (prevCashFlowReport?.data as CashFlowData) ?? null,
      hasAnyStoredReport,
    };
  }

  private async fetchAccountSnapshots(
    householdId: string,
    yearMonth: string,
    accounts: Account[],
  ): Promise<AccountSnapshotData[]> {
    return Promise.all(
      accounts.map(async (account) => {
        const snapshot = await accountRepository.getSnapshot(householdId, account.id, yearMonth);
        return { accountId: account.id, amount: snapshot?.amount || 0 };
      }),
    );
  }

  private async fetchDebtSnapshots(
    householdId: string,
    yearMonth: string,
    debts: DebtAccount[],
  ): Promise<DebtSnapshotData[]> {
    return Promise.all(
      debts.map(async (debt) => {
        const snapshot = await debtSnapshotRepository.getSnapshot(householdId, debt.id, yearMonth);
        return { debtId: debt.id, closingBalance: snapshot?.closingBalance || 0 };
      }),
    );
  }

  private async fetchPortfolioSnapshots(
    householdId: string,
    yearMonth: string,
    portfolios: Portfolio[],
  ): Promise<PortfolioSnapshotData[]> {
    return Promise.all(
      portfolios.map(async (portfolio) => {
        const snapshot = await portfolioSnapshotRepository.getSnapshot(
          householdId,
          portfolio.id,
          yearMonth,
        );
        return { portfolioId: portfolio.id, gain: snapshot?.performance?.gain || 0 };
      }),
    );
  }
}

export const fetchReportDataUseCase = new FetchReportDataUseCase();
