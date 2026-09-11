import { type AuthContext } from '@/application/types';
import {
  type BalanceSheetData,
  type CashFlowData,
  type IncomeStatementData,
} from '@/domains/report/schemas';
import { type ReportLabelResolver } from '@/domains/report/reportCalculations';
import { householdPermissionService } from '@/application/household/householdPermissionService';

import { fetchReportDataUseCase } from './fetchReportDataUseCase';
import {
  getReportPersistenceStateUseCase,
  type ReportPersistenceState,
} from './getReportPersistenceStateUseCase';
import { previewBalanceSheetUseCase } from './previewBalanceSheetUseCase';
import { previewCashFlowUseCase } from './previewCashFlowUseCase';
import { previewIncomeStatementUseCase } from './previewIncomeStatementUseCase';

export interface PreviewFinancialReportsRequest {
  householdId: string;
  auth: AuthContext;
  year: number;
  month: number;
  labelResolver?: ReportLabelResolver;
}

export type ReportTimestamps = ReportPersistenceState['timestamps'];

export interface PreviewFinancialReportsResult {
  incomeStatement: IncomeStatementData;
  balanceSheet: BalanceSheetData;
  cashFlow: CashFlowData;
  isPersisted: boolean;
  timestamps: ReportTimestamps;
}

export class PreviewFinancialReportsWorkflow {
  async execute(
    request: PreviewFinancialReportsRequest,
  ): Promise<PreviewFinancialReportsResult> {
    const { householdId, auth, year, month, labelResolver } = request;
    const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const bundle = await fetchReportDataUseCase.execute({ householdId, yearMonth });

    const incomeStatement = previewIncomeStatementUseCase.execute(bundle, labelResolver);
    const balanceSheet = previewBalanceSheetUseCase.execute(bundle, incomeStatement, labelResolver);
    const cashFlow = previewCashFlowUseCase.execute(bundle, labelResolver);

    const { isPersisted, timestamps } = await getReportPersistenceStateUseCase.execute({
      householdId,
      yearMonth,
    });

    return {
      incomeStatement,
      balanceSheet,
      cashFlow,
      isPersisted,
      timestamps,
    };
  }
}

export const previewFinancialReportsWorkflow = new PreviewFinancialReportsWorkflow();
