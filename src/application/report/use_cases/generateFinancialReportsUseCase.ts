import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import {
  type BalanceSheetData,
  type CashFlowData,
  type IncomeStatementData,
  ReportType,
} from '@/domains/report/schemas';
import { type ReportLabelResolver } from '@/domains/report/reportCalculations';
import { reportRepository } from '@/infra/repositories/reportRepository';

import {
  type PreviewFinancialReportsResult,
  previewFinancialReportsUseCase,
} from './previewFinancialReportsUseCase';

export interface GenerateFinancialReportsRequest {
  householdId: string;
  auth: AuthContext;
  year: number;
  month: number;
  labelResolver?: ReportLabelResolver;
}

export interface GenerateFinancialReportsResult {
  incomeStatement: IncomeStatementData;
  balanceSheet: BalanceSheetData;
  cashFlow: CashFlowData;
  timestamp: Date;
}

export class GenerateFinancialReportsUseCase {
  async execute(
    request: GenerateFinancialReportsRequest,
  ): Promise<GenerateFinancialReportsResult> {
    const { householdId, auth, year, month, labelResolver } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const preview: PreviewFinancialReportsResult = await previewFinancialReportsUseCase.execute({
      householdId,
      auth,
      year,
      month,
      labelResolver,
    });

    const timestamp = new Date();
    const userEmail = auth.email ?? auth.uid;
    await Promise.all([
      this.persist(householdId, preview.incomeStatement, ReportType.INCOME_STATEMENT, userEmail),
      this.persist(householdId, preview.balanceSheet, ReportType.BALANCE_SHEET, userEmail),
      this.persist(householdId, preview.cashFlow, ReportType.CASH_FLOW, userEmail),
    ]);

    return {
      incomeStatement: preview.incomeStatement,
      balanceSheet: preview.balanceSheet,
      cashFlow: preview.cashFlow,
      timestamp,
    };
  }

  private persist(
    householdId: string,
    data: IncomeStatementData | BalanceSheetData | CashFlowData,
    type: ReportType,
    userEmail: string,
  ): Promise<void> {
    return reportRepository.saveReport(
      householdId,
      {
        householdId,
        type,
        yearMonth: data.yearMonth,
        data,
        createdBy: userEmail,
        updatedBy: userEmail,
      },
      userEmail,
    );
  }
}

export const generateFinancialReportsUseCase = new GenerateFinancialReportsUseCase();
