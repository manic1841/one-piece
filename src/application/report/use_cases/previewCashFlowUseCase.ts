import { type CashFlowData } from '@/domains/report/schemas';
import {
  type ReportLabelResolver,
  calculateCashFlow,
} from '@/domains/report/reportCalculations';
import { type JournalEntryLine } from '@/domains/ledger/schemas';

export interface PreviewCashFlowRequest {
  yearMonth: string;
  entries: JournalEntryLine[];
  beginningBalance: number;
  actualBalance: number;
  labelResolver?: ReportLabelResolver;
}

export class PreviewCashFlowUseCase {
  execute(request: PreviewCashFlowRequest): CashFlowData {
    return calculateCashFlow(request);
  }
}

export const previewCashFlowUseCase = new PreviewCashFlowUseCase();
