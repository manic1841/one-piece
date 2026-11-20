import { type FinancialReport } from '@/domains/report/schemas';

import {
  type BalanceSheetReport,
  type FinancialAnalysisKpis,
  isBalanceSheet,
  isIncome,
  kpisOf,
  resolveAnchorReport,
} from './reportAnchor';

export interface ResolveReportAnchorRequest {
  reports: readonly FinancialReport[];
  closedMonths: ReadonlySet<string>;
}

export interface ResolvedReportAnchor {
  anchorReport: BalanceSheetReport;
  kpis: FinancialAnalysisKpis;
}

/**
 * The ADR-0090 anchor and its headline figures. Null without any balance sheet.
 * Reports are read from — never fetched by — the calling workflow.
 */
export class ResolveReportAnchorUseCase {
  execute({ reports, closedMonths }: ResolveReportAnchorRequest): ResolvedReportAnchor | null {
    const anchorReport = resolveAnchorReport(reports.filter(isBalanceSheet));
    if (anchorReport === null) {
      return null;
    }

    const anchorIncome = reports
      .filter(isIncome)
      .find((report) => report.yearMonth === anchorReport.yearMonth);

    return { anchorReport, kpis: kpisOf(anchorReport, anchorIncome, closedMonths) };
  }
}

export const resolveReportAnchorUseCase = new ResolveReportAnchorUseCase();
