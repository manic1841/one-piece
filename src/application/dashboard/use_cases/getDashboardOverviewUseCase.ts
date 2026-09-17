import { householdPermissionService } from '@/application/household/householdPermissionService';
import { GetFinancialPeriodUseCase } from '@/application/monthly_close/use_cases/financialPeriodAccessUseCases';
import { listReportsUseCase } from '@/application/report/use_cases/listReportsUseCase';
import { type AuthContext } from '@/application/types';
import { ReportType } from '@/domains/report/schemas';
import { type FinancialReport } from '@/domains/report/schemas';

export interface DashboardNetWorthPoint {
  year: number;
  month: number;
  netAssets: number | null;
}

export interface DashboardAnchor {
  yearMonth: string;
  netWorth: number;
  netWorthSeries: DashboardNetWorthPoint[];
}

export interface DashboardOverview {
  anchor: DashboardAnchor | null;
}

export interface GetDashboardOverviewRequest {
  householdId: string;
  auth: AuthContext;
}

const SERIES_LENGTH = 12;

type BalanceSheetReport = Extract<FinancialReport, { type: typeof ReportType.BALANCE_SHEET }>;

const isBalanceSheet = (report: FinancialReport): report is BalanceSheetReport =>
  report.type === ReportType.BALANCE_SHEET;

const toMonthCode = (yearMonth: string): number => {
  const [year, month] = yearMonth.split('-').map(Number);
  return year * 100 + month;
};

const shiftMonth = (
  year: number,
  month: number,
  offset: number,
): { year: number; month: number } => {
  const total = year * 12 + (month - 1) + offset;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
};

const toYearMonth = ({ year, month }: { year: number; month: number }): string =>
  `${year}-${String(month).padStart(2, '0')}`;

export class GetDashboardOverviewUseCase {
  private readonly getFinancialPeriod = new GetFinancialPeriodUseCase();

  async execute(request: GetDashboardOverviewRequest): Promise<DashboardOverview> {
    const { householdId, auth } = request;
    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const reports = await listReportsUseCase.execute({ householdId, auth });
    const balanceSheets = reports
      .filter(isBalanceSheet)
      .sort((a, b) => toMonthCode(b.yearMonth) - toMonthCode(a.yearMonth));

    for (const report of balanceSheets) {
      const period = await this.getFinancialPeriod.execute({
        householdId,
        yearMonth: report.yearMonth,
      });
      if (period?.status !== 'CLOSED') {
        continue;
      }
      return { anchor: this.buildAnchor(report, balanceSheets) };
    }

    return { anchor: null };
  }

  private buildAnchor(
    anchorReport: BalanceSheetReport,
    balanceSheets: BalanceSheetReport[],
  ): DashboardAnchor {
    const netAssetsByMonth = new Map(
      balanceSheets.map((report) => [
        report.yearMonth,
        report.data.assets.total - report.data.liabilities.total,
      ]),
    );

    const [anchorYear, anchorMonth] = anchorReport.yearMonth.split('-').map(Number);
    const netWorthSeries: DashboardNetWorthPoint[] = [];
    for (let offset = -(SERIES_LENGTH - 1); offset <= 0; offset++) {
      const { year, month } = shiftMonth(anchorYear, anchorMonth, offset);
      netWorthSeries.push({
        year,
        month,
        netAssets: netAssetsByMonth.get(toYearMonth({ year, month })) ?? null,
      });
    }

    return {
      yearMonth: anchorReport.yearMonth,
      netWorth: netAssetsByMonth.get(anchorReport.yearMonth) ?? 0,
      netWorthSeries,
    };
  }
}

export const getDashboardOverviewUseCase = new GetDashboardOverviewUseCase();
