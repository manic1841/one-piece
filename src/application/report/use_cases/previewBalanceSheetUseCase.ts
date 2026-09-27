import {
  type ReportLabelResolver,
  calculateBalanceSheet,
} from '@/domains/report/reportCalculations';
import { type BalanceSheetData, type IncomeStatementData } from '@/domains/report/schemas';

import { type ReportDataBundle } from './fetchReportDataUseCase';

export class PreviewBalanceSheetUseCase {
  execute(
    bundle: ReportDataBundle,
    incomeStatement: IncomeStatementData,
    labelResolver?: ReportLabelResolver,
  ): BalanceSheetData {
    return calculateBalanceSheet({
      yearMonth: bundle.yearMonth,
      entries: bundle.entriesUntilMonth,
      monthlyEntries: bundle.entriesByMonth,
      accounts: bundle.activeAccounts.map((a) => ({
        id: a.id,
        name: a.name,
        category: a.category,
      })),
      portfolios: bundle.activePortfolios.map((p) => ({ id: p.id, name: p.name })),
      debtAccounts: bundle.activeDebts.map((d) => ({ id: d.id, name: d.name })),
      accountSnapshots: bundle.accountSnapshots,
      debtSnapshots: bundle.debtSnapshots,
      portfolioSnapshots: bundle.portfolioSnapshots,
      prevBalanceSheet: bundle.prevBalanceSheet,
      incomeStatement,
      labelResolver,
    });
  }
}

export const previewBalanceSheetUseCase = new PreviewBalanceSheetUseCase();
