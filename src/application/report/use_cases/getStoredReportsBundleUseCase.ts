import { withReadPermission } from '@/application/common/readGuard';
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
    // One check for the bundle: the three reads below share the same household.
    const [incomeStatement, balanceSheet, cashFlow] = await withReadPermission(
      householdId,
      auth,
      () =>
        Promise.all([
          getStoredReportUseCase.execute({
            householdId,
            yearMonth,
            kind: 'incomeStatement',
            auth,
            skipPermissionCheck: true,
          }),
          getStoredReportUseCase.execute({
            householdId,
            yearMonth,
            kind: 'balanceSheet',
            auth,
            skipPermissionCheck: true,
          }),
          getStoredReportUseCase.execute({
            householdId,
            yearMonth,
            kind: 'cashFlow',
            auth,
            skipPermissionCheck: true,
          }),
        ]),
    );

    return { incomeStatement, balanceSheet, cashFlow };
  }
}

export const getStoredReportsBundleUseCase = new GetStoredReportsBundleUseCase();
