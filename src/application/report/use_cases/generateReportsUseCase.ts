import { householdPermissionService } from '@/application/household/householdPermissionService';
import { reportService } from '@/domains/report/reportService';
import { type FinancialReport, ReportType } from '@/domains/report/schemas';
import { logger } from '@/utils/logger';

interface GenerateReportsRequest {
  householdId: string;
  year: number;
  month: number;
  auth: {
    uid: string;
    isGlobalAdmin: boolean;
  };
}

class GenerateReportsUseCase {
  async execute(request: GenerateReportsRequest): Promise<{
    incomeStatement: FinancialReport;
    balanceSheet: FinancialReport;
  }> {
    const { householdId, year, month, auth } = request;
    logger.info('generateReportsUseCase.start', 'Report');

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
    const [incomeStatementData, balanceSheetData] = await Promise.all([
      reportService.generateIncomeStatement(householdId, yearMonth),
      reportService.generateBalanceSheet(householdId, yearMonth),
    ]);

    const isReport: FinancialReport = {
      id: `is-${year}-${month}`,
      type: ReportType.INCOME_STATEMENT,
      householdId,
      yearMonth,
      data: incomeStatementData,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: auth.uid,
      updatedBy: auth.uid,
    };

    const bsReport: FinancialReport = {
      id: `bs-${year}-${month}`,
      type: ReportType.BALANCE_SHEET,
      householdId,
      yearMonth,
      data: balanceSheetData,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: auth.uid,
      updatedBy: auth.uid,
    };

    return {
      incomeStatement: isReport,
      balanceSheet: bsReport,
    };
  }
}

export const generateReportsUseCase = new GenerateReportsUseCase();
