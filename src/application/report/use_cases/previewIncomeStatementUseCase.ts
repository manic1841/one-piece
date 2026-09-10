import {
  type IncomeStatementData,
} from '@/domains/report/schemas';
import {
  type ReportLabelResolver,
  calculateIncomeStatement,
} from '@/domains/report/reportCalculations';
import { type JournalEntryLine } from '@/domains/ledger/schemas';

export interface PreviewIncomeStatementRequest {
  yearMonth: string;
  entries: JournalEntryLine[];
  labelResolver?: ReportLabelResolver;
}

export class PreviewIncomeStatementUseCase {
  execute(request: PreviewIncomeStatementRequest): IncomeStatementData {
    return calculateIncomeStatement(request);
  }
}

export const previewIncomeStatementUseCase = new PreviewIncomeStatementUseCase();
