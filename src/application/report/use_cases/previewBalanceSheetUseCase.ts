import {
  type BalanceSheetData,
  type IncomeStatementData,
} from '@/domains/report/schemas';
import {
  type AccountSnapshotData,
  type DebtSnapshotData,
  type PortfolioSnapshotData,
  type ReportLabelResolver,
  calculateBalanceSheet,
} from '@/domains/report/reportCalculations';
import { type JournalEntryLine } from '@/domains/ledger/schemas';

export interface PreviewBalanceSheetRequest {
  yearMonth: string;
  entries: JournalEntryLine[];
  monthlyEntries: JournalEntryLine[];
  accounts: { id: string; name: string; category: string }[];
  portfolios: { id: string; name: string }[];
  debtAccounts: { id: string; name: string }[];
  accountSnapshots: AccountSnapshotData[];
  debtSnapshots: DebtSnapshotData[];
  portfolioSnapshots: PortfolioSnapshotData[];
  prevBalanceSheet: BalanceSheetData | null;
  incomeStatement: IncomeStatementData;
  labelResolver?: ReportLabelResolver;
}

export class PreviewBalanceSheetUseCase {
  execute(request: PreviewBalanceSheetRequest): BalanceSheetData {
    return calculateBalanceSheet(request);
  }
}

export const previewBalanceSheetUseCase = new PreviewBalanceSheetUseCase();
