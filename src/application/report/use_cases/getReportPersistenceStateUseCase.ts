import { format } from 'date-fns';

import { ReportType } from '@/domains/report/schemas';
import { reportRepository } from '@/infra/repositories/reportRepository';

export interface ReportPersistenceState {
  isPersisted: boolean;
  timestamps: {
    incomeStatement?: string;
    balanceSheet?: string;
    cashFlow?: string;
  };
}

export interface GetReportPersistenceStateRequest {
  householdId: string;
  yearMonth: string;
}

export class GetReportPersistenceStateUseCase {
  async execute(
    request: GetReportPersistenceStateRequest,
  ): Promise<ReportPersistenceState> {
    const { householdId, yearMonth } = request;

    const existingReports = await Promise.all([
      reportRepository.getReport(householdId, yearMonth, ReportType.INCOME_STATEMENT),
      reportRepository.getReport(householdId, yearMonth, ReportType.BALANCE_SHEET),
      reportRepository.getReport(householdId, yearMonth, ReportType.CASH_FLOW),
    ]);

    const isPersisted = existingReports.every((report) => report !== null);
    const timestamps: ReportPersistenceState['timestamps'] = {};
    if (isPersisted) {
      timestamps.incomeStatement = format(existingReports[0]!.updatedAt, 'HH:mm');
      timestamps.balanceSheet = format(existingReports[1]!.updatedAt, 'HH:mm');
      timestamps.cashFlow = format(existingReports[2]!.updatedAt, 'HH:mm');
    }

    return { isPersisted, timestamps };
  }
}

export const getReportPersistenceStateUseCase = new GetReportPersistenceStateUseCase();
