import {
  type ReportLabelResolver,
  calculateCashFlow,
  calculateLiquidBalance,
} from '@/domains/report/reportCalculations';
import { type CashFlowData } from '@/domains/report/schemas';

import { type ReportDataBundle } from './fetchReportDataUseCase';

export class PreviewCashFlowUseCase {
  execute(bundle: ReportDataBundle, labelResolver?: ReportLabelResolver): CashFlowData {
    const actualBalance = calculateLiquidBalance(bundle.activeAccounts, bundle.accountSnapshots);

    let beginningBalance = 0;
    if (bundle.prevCashFlow) {
      beginningBalance = bundle.prevCashFlow.actualBalance;
    } else if (bundle.hasAnyStoredReport) {
      beginningBalance = calculateLiquidBalance(bundle.activeAccounts, bundle.prevAccountSnapshots);
    }

    return calculateCashFlow({
      yearMonth: bundle.yearMonth,
      entries: bundle.entriesByMonth,
      beginningBalance,
      actualBalance,
      labelResolver,
    });
  }
}

export const previewCashFlowUseCase = new PreviewCashFlowUseCase();
