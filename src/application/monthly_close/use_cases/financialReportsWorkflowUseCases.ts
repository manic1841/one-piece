import { generateFinancialReportsUseCase } from '@/application/report/use_cases/generateFinancialReportsUseCase';
import { getReportPersistenceStateUseCase } from '@/application/report/use_cases/getReportPersistenceStateUseCase';
import { type AuthContext } from '@/application/types';
import { MonthlyCloseCommandError, MonthlyCloseCommandErrorCode } from '@/application/monthly_close/errors';

export interface RunFinancialReportsRequest {
  householdId: string;
  year: number;
  month: number;
  auth: AuthContext;
}

/**
 * FINANCIAL_REPORTS stage action (spec 05 stage 05): generates all three
 * reports for the period.
 */
export class RunFinancialReportsUseCase {
  async execute(request: RunFinancialReportsRequest): Promise<void> {
    const { householdId, auth, year, month } = request;
    await generateFinancialReportsUseCase.execute({ householdId, auth, year, month });
  }
}

export interface CheckCloseReadinessRequest {
  householdId: string;
  yearMonth: string;
}

/**
 * CLOSE_PERIOD stage gate (spec 05 stage 06): all three reports must be
 * persisted before the period can close.
 */
export class CheckCloseReadinessUseCase {
  async execute(request: CheckCloseReadinessRequest): Promise<void> {
    const { householdId, yearMonth } = request;
    const persistence = await getReportPersistenceStateUseCase.execute({
      householdId,
      yearMonth,
    });
    if (!persistence.isPersisted) {
      throw new MonthlyCloseCommandError(
        MonthlyCloseCommandErrorCode.REPORTS_NOT_PERSISTED,
        'all three reports must be persisted before closing',
      );
    }
  }
}
