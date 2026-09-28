import {
  MonthlyCloseCommandError,
  MonthlyCloseCommandErrorCode,
} from '@/application/monthly_close/errors';
import { generateFinancialReportsUseCase } from '@/application/report/use_cases/generateFinancialReportsUseCase';
import { getReportPersistenceStateUseCase } from '@/application/report/use_cases/getReportPersistenceStateUseCase';
import { type AuthContext } from '@/application/types';
import {
  type FinancialPeriod,
} from '@/domains/financial_period/schemas';
import { isStageCompleted } from '@/domains/financial_period/stateMachine';
import { type ReportLabelResolver } from '@/domains/report/reportCalculations';

export interface RunFinancialReportsRequest {
  householdId: string;
  year: number;
  month: number;
  auth: AuthContext;
  labelResolver?: ReportLabelResolver;
}

/**
 * FINANCIAL_REPORTS stage action (spec 05 stage 05): generates all three
 * reports for the period.
 */
export class RunFinancialReportsUseCase {
  async execute(request: RunFinancialReportsRequest): Promise<void> {
    const { householdId, auth, year, month, labelResolver } = request;
    await generateFinancialReportsUseCase.execute({
      householdId,
      auth,
      year,
      month,
      labelResolver,
    });
  }
}

export interface CheckCloseReadinessRequest {
  householdId: string;
  yearMonth: string;
  period: FinancialPeriod;
}

/**
 * CLOSE_PERIOD stage gate (spec 05 stage 06): the FINANCIAL_REPORTS stage must
 * be confirmed and all three reports persisted before the period can close.
 * The stage check closes the old-report loophole: stale report files persisting
 * from an earlier close no longer satisfy the gate after a reopen.
 */
export class CheckCloseReadinessUseCase {
  async execute(request: CheckCloseReadinessRequest): Promise<void> {
    const { householdId, yearMonth, period } = request;
    if (!isStageCompleted(period, 'FINANCIAL_REPORTS')) {
      throw new MonthlyCloseCommandError(
        MonthlyCloseCommandErrorCode.REPORTS_NOT_PERSISTED,
        'financial reports must be confirmed before closing',
      );
    }
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
