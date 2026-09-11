import {
  type IncomeStatementData,
} from '@/domains/report/schemas';
import {
  type ReportLabelResolver,
  calculateIncomeStatement,
} from '@/domains/report/reportCalculations';

import { type ReportDataBundle } from './fetchReportDataUseCase';

export class PreviewIncomeStatementUseCase {
  execute(bundle: ReportDataBundle, labelResolver?: ReportLabelResolver): IncomeStatementData {
    return calculateIncomeStatement({
      yearMonth: bundle.yearMonth,
      entries: bundle.entriesByMonth,
      labelResolver,
    });
  }
}

export const previewIncomeStatementUseCase = new PreviewIncomeStatementUseCase();
