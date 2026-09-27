import { householdPermissionService } from '@/application/household/householdPermissionService';
import { GetFinancialPeriodUseCase } from '@/application/monthly_close/use_cases/financialPeriodAccessUseCases';
import { listPortfolioSnapshotsUseCase } from '@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase';
import { listPortfoliosUseCase } from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import { listReportsUseCase } from '@/application/report/use_cases/listReportsUseCase';
import { type AuthContext } from '@/application/types';
import { type Transaction } from '@/domains/ledger/schemas';
import { type PortfolioSnapshot } from '@/domains/portfolio/types/portfolio';
import { ReportType } from '@/domains/report/schemas';
import { type FinancialReport } from '@/domains/report/schemas';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export interface DashboardNetWorthPoint {
  year: number;
  month: number;
  netAssets: number | null;
}

export interface DashboardCompositionItem {
  key: string;
  label: string;
  amount: number;
}

export interface DashboardComposition {
  assets: DashboardCompositionItem[];
  liabilities: DashboardCompositionItem[];
}

export interface DashboardCashFlowPoint {
  year: number;
  month: number;
  netCashFlow: number | null;
}

export interface DashboardAnchor {
  yearMonth: string;
  netWorth: number;
  assets: number;
  liabilities: number;
  composition: DashboardComposition;
  ytdBaseline: {
    yearMonth: string;
    netWorth: number;
  } | null;
  netWorthSeries: DashboardNetWorthPoint[];
}

export interface DashboardPulse {
  netCashFlow: number | null;
  investmentReturn: number | null;
  investmentLeverage: number | null;
  monthlyDebtPayment: number | null;
  investmentGain: number | null;
}

export interface DashboardOverview {
  anchor: DashboardAnchor | null;
  pulse: DashboardPulse | null;
  cashFlowSeries: DashboardCashFlowPoint[];
}

export interface GetDashboardOverviewRequest {
  householdId: string;
  auth: AuthContext;
}

const SERIES_LENGTH = 12;

type BalanceSheetReport = Extract<FinancialReport, { type: typeof ReportType.BALANCE_SHEET }>;
type CashFlowReport = Extract<FinancialReport, { type: typeof ReportType.CASH_FLOW }>;

const isBalanceSheet = (report: FinancialReport): report is BalanceSheetReport =>
  report.type === ReportType.BALANCE_SHEET;

const isCashFlow = (report: FinancialReport): report is CashFlowReport =>
  report.type === ReportType.CASH_FLOW;

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

const buildMonthWindow = (yearMonth: string): { start: Date; end: Date } => {
  const [year, month] = yearMonth.split('-').map(Number);
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 1),
  };
};

const buildTwelveMonthSlots = (anchorYearMonth: string): { year: number; month: number }[] => {
  const [anchorYear, anchorMonth] = anchorYearMonth.split('-').map(Number);
  const slots: { year: number; month: number }[] = [];
  for (let offset = -(SERIES_LENGTH - 1); offset <= 0; offset++) {
    slots.push(shiftMonth(anchorYear, anchorMonth, offset));
  }
  return slots;
};

const sumDebtPayments = (transactions: Transaction[]): number =>
  transactions.reduce((sum, transaction) => sum + (transaction.amount ?? 0), 0);

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
      const pulse = await this.buildPulse(householdId, auth, report.yearMonth, reports);
      return {
        anchor: this.buildAnchor(report, balanceSheets),
        pulse,
        cashFlowSeries: this.buildCashFlowSeries(report.yearMonth, reports),
      };
    }

    return { anchor: null, pulse: null, cashFlowSeries: [] };
  }

  private async buildPulse(
    householdId: string,
    auth: AuthContext,
    anchorYearMonth: string,
    reports: FinancialReport[],
  ): Promise<DashboardPulse> {
    const [year, month] = anchorYearMonth.split('-').map(Number);
    const cashFlow = reports
      .filter(isCashFlow)
      .find((report) => report.yearMonth === anchorYearMonth);

    const portfolios = await listPortfoliosUseCase.execute({ householdId, auth });
    const snapshots: PortfolioSnapshot[] = [];
    for (const portfolio of portfolios) {
      const monthSnapshots = await listPortfolioSnapshotsUseCase.execute({
        householdId,
        portfolioId: portfolio.id,
        year,
        month,
        auth,
      });
      snapshots.push(...monthSnapshots);
    }

    const totalGain = snapshots.reduce(
      (sum, snapshot) => sum + (snapshot.performance?.gain ?? 0),
      0,
    );
    const totalOpeningValue = snapshots.reduce(
      (sum, snapshot) => sum + (snapshot.performance?.openingValue ?? 0),
      0,
    );

    let exposure = 0;
    let netValue = 0;
    for (const snapshot of snapshots) {
      for (const account of snapshot.accounts ?? []) {
        for (const holding of account.holdings ?? []) {
          const marketValue = holding.marketValue ?? 0;
          exposure += marketValue * (holding.leverage ?? 1);
          netValue += marketValue;
        }
      }
    }

    const { start, end } = buildMonthWindow(anchorYearMonth);
    const debtPayments = await transactionRepository.listDebtPaymentsByDateRange(
      householdId,
      start,
      end,
    );

    return {
      netCashFlow: cashFlow ? cashFlow.data.netCashChange : null,
      investmentReturn:
        snapshots.length > 0 && totalOpeningValue > 0
          ? (totalGain / totalOpeningValue) * 100
          : null,
      investmentLeverage: netValue > 0 ? exposure / netValue : null,
      monthlyDebtPayment: debtPayments.length > 0 ? sumDebtPayments(debtPayments) : null,
      investmentGain: snapshots.length > 0 ? totalGain : null,
    };
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
    const netWorthSeries: DashboardNetWorthPoint[] = buildTwelveMonthSlots(
      anchorReport.yearMonth,
    ).map(({ year, month }) => ({
      year,
      month,
      netAssets: netAssetsByMonth.get(toYearMonth({ year, month })) ?? null,
    }));

    return {
      yearMonth: anchorReport.yearMonth,
      netWorth: netAssetsByMonth.get(anchorReport.yearMonth) ?? 0,
      assets: anchorReport.data.assets.total,
      liabilities: anchorReport.data.liabilities.total,
      composition: {
        assets: Object.entries(anchorReport.data.assets.groups).map(([key, group]) => ({
          key,
          label: group.label,
          amount: group.total,
        })),
        liabilities: Object.entries(anchorReport.data.liabilities.groups).map(([key, group]) => ({
          key,
          label: group.label,
          amount: group.total,
        })),
      },
      ytdBaseline: resolveYtdBaseline(anchorYear, anchorMonth, balanceSheets),
      netWorthSeries,
    };
  }

  private buildCashFlowSeries(
    anchorYearMonth: string,
    reports: FinancialReport[],
  ): DashboardCashFlowPoint[] {
    const netCashFlowByMonth = new Map(
      reports.filter(isCashFlow).map((report) => [report.yearMonth, report.data.netCashChange]),
    );

    return buildTwelveMonthSlots(anchorYearMonth).map(({ year, month }) => ({
      year,
      month,
      netCashFlow: netCashFlowByMonth.get(toYearMonth({ year, month })) ?? null,
    }));
  }
}

const resolveYtdBaseline = (
  anchorYear: number,
  anchorMonth: number,
  balanceSheets: BalanceSheetReport[],
): DashboardAnchor['ytdBaseline'] => {
  const sameYearEarlier = balanceSheets.filter((report) => {
    const [year, month] = report.yearMonth.split('-').map(Number);
    return year === anchorYear && month < anchorMonth;
  });
  if (sameYearEarlier.length === 0) {
    return null;
  }

  const january = sameYearEarlier.find((report) => report.yearMonth.endsWith('-01'));
  const baselineReport =
    january ??
    sameYearEarlier.reduce((earliest, report) =>
      toMonthCode(report.yearMonth) < toMonthCode(earliest.yearMonth) ? report : earliest,
    );

  return {
    yearMonth: baselineReport.yearMonth,
    netWorth: baselineReport.data.assets.total - baselineReport.data.liabilities.total,
  };
};

export const getDashboardOverviewUseCase = new GetDashboardOverviewUseCase();
