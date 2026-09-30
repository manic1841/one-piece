import { type AuthContext } from '@/application/types';
import {
  type BalanceSheetData,
  type CashFlowData,
  type IncomeStatementData,
} from '@/domains/report/schemas';

import { getStoredReportUseCase } from './getStoredReportUseCase';

/**
 * The three persisted reports for one month, loaded together so a drift
 * consumer can compare a preview bundle against the frozen record in one go.
 * Each entry is null when that report was never generated.
 */
export interface StoredReportsBundle {
  incomeStatement: IncomeStatementData | null;
  balanceSheet: BalanceSheetData | null;
  cashFlow: CashFlowData | null;
}

export interface GetStoredReportsBundleRequest {
  householdId: string;
  yearMonth: string;
  auth: AuthContext;
}

export class GetStoredReportsBundleUseCase {
  async execute(request: GetStoredReportsBundleRequest): Promise<StoredReportsBundle> {
    const { householdId, yearMonth, auth } = request;
    const [incomeStatement, balanceSheet, cashFlow] = await Promise.all([
      getStoredReportUseCase.execute({ householdId, yearMonth, kind: 'incomeStatement', auth }),
      getStoredReportUseCase.execute({ householdId, yearMonth, kind: 'balanceSheet', auth }),
      getStoredReportUseCase.execute({ householdId, yearMonth, kind: 'cashFlow', auth }),
    ]);

    return { incomeStatement, balanceSheet, cashFlow };
  }
}

export const getStoredReportsBundleUseCase = new GetStoredReportsBundleUseCase();
