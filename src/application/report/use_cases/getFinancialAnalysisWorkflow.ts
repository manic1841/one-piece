import { householdPermissionService } from '@/application/household/householdPermissionService';
import { ListFinancialPeriodsUseCase } from '@/application/monthly_close/use_cases/financialPeriodAccessUseCases';
import { listPortfolioSnapshotsUseCase } from '@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase';
import { listPortfoliosUseCase } from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import { listReportsUseCase } from '@/application/report/use_cases/listReportsUseCase';
import { type AuthContext } from '@/application/types';
import { type PortfolioSnapshot } from '@/domains/portfolio/types/portfolio';
import {
  ANALYSIS_RANGES,
  type AnalysisGranularity,
  type AnalysisRange,
} from '@/domains/report/analysisScale';
import { type FinancialReport, ReportType } from '@/domains/report/schemas';

import {
  EMPTY_KPIS,
  isBalanceSheet,
  isIncome,
  kpisOf,
  resolveAnchorReport,
  savingsRateOf,
  toMonthCode,
} from './reportAnchor';
import { rollUpFinancialAnalysisUseCase } from './rollUpFinancialAnalysisUseCase';

export type { AnalysisGranularity, AnalysisRange } from '@/domains/report/analysisScale';

const RANGE_MONTHS: Record<Exclude<AnalysisRange, 'all'>, number> = {
  '1y': 12,
  '3y': 36,
  '5y': 60,
};

interface AnalysisPointBase {
  yearMonth: string;
  /** The period is closed. A missing period record counts as not closed. */
  closed: boolean;
}

export interface NetWorthAnalysisPoint extends AnalysisPointBase {
  netWorth: number;
  assets: number;
  liabilities: number;
}

export interface IncomeAnalysisPoint extends AnalysisPointBase {
  income: number;
  expense: number;
  /** Null when `income <= 0`; a negative rate is a legitimate result. */
  savingsRate: number | null;
}

export interface CashFlowAnalysisPoint extends AnalysisPointBase {
  netCashFlow: number;
}

export interface AssetCompositionPoint extends AnalysisPointBase {
  /** Fixed denominator; the group values are shares of this total. */
  assetsTotal: number;
  cash: number;
  investment: number;
  property: number;
}

export interface InvestmentPerformancePoint extends AnalysisPointBase {
  gain: number;
  openingValue: number;
  /** Null when opening value is not positive. */
  returnRate: number | null;
}

export interface DebtLeveragePoint extends AnalysisPointBase {
  liabilities: number;
  assetsTotal: number;
  /** Null when total assets are not positive. */
  debtRatio: number | null;
  /** Household market-value weighted leverage; null when the month's snapshots are incomplete. */
  leverage: number | null;
}

export interface CashCoveragePoint extends AnalysisPointBase {
  /** Cash and bank assets, including time deposits. */
  cash: number;
  /** Average expense of this month and the two before it. */
  expenseAverage: number | null;
  /** Null when the three-month window is incomplete or the average is not positive. */
  coverageMonths: number | null;
}

export interface FinancialAnalysisKpis {
  yearMonth: string | null;
  assets: number | null;
  netWorth: number | null;
  liabilities: number | null;
  /** Null without a same-month income statement, or when income is not positive. */
  savingsRate: number | null;
  anchorClosed: boolean | null;
}

export interface FinancialAnalysis {
  anchor: { yearMonth: string; closed: boolean } | null;
  kpis: FinancialAnalysisKpis;
  /** Distinct not-closed months inside the range, oldest first. */
  unclosedMonths: string[];
  range: AnalysisRange;
  /** Ranges that select a different set of months, in `ANALYSIS_RANGES` order. */
  availableRanges: AnalysisRange[];
  netWorthPoints: NetWorthAnalysisPoint[];
  assetCompositionPoints: AssetCompositionPoint[];
  investmentPerformancePoints: InvestmentPerformancePoint[];
  incomePoints: IncomeAnalysisPoint[];
  cashFlowPoints: CashFlowAnalysisPoint[];
  debtLeveragePoints: DebtLeveragePoint[];
  cashCoveragePoints: CashCoveragePoint[];
}

export interface GetFinancialAnalysisRequest {
  householdId: string;
  auth: AuthContext;
  range: AnalysisRange;
}

/** Drawable points for one block: in range, oldest first, each marked closed or not. */
const collectPoints = <TReport extends FinancialReport, TPoint extends AnalysisPointBase>(
  reports: TReport[],
  closedMonths: Set<string>,
  inRange: (month: string) => boolean,
  map: (report: TReport, closed: boolean) => TPoint,
  include: (report: TReport) => boolean = () => true,
): TPoint[] =>
  reports
    .filter((report) => inRange(report.yearMonth) && include(report))
    .sort((a, b) => toMonthCode(a.yearMonth) - toMonthCode(b.yearMonth))
    .map((report) => map(report, closedMonths.has(report.yearMonth)));

type CashFlowReport = Extract<FinancialReport, { type: typeof ReportType.CASH_FLOW }>;

const isCashFlow = (report: FinancialReport): report is CashFlowReport =>
  report.type === ReportType.CASH_FLOW;

interface SnapshotMonth {
  gain: number;
  openingValue: number;
  exposure: number;
  marketValue: number;
}

const monthKeyOf = (snapshot: PortfolioSnapshot): string =>
  `${snapshot.year}-${String(snapshot.month).padStart(2, '0')}`;

/** One month's household snapshot totals, summed across every portfolio. */
const aggregateSnapshots = (snapshots: PortfolioSnapshot[]): Map<string, SnapshotMonth> => {
  const byMonth = new Map<string, SnapshotMonth>();
  for (const snapshot of snapshots) {
    const key = monthKeyOf(snapshot);
    const totals = byMonth.get(key) ?? { gain: 0, openingValue: 0, exposure: 0, marketValue: 0 };
    totals.gain += snapshot.performance?.gain ?? 0;
    totals.openingValue += snapshot.performance?.openingValue ?? 0;
    for (const account of snapshot.accounts) {
      for (const holding of account.holdings ?? []) {
        const marketValue = holding.marketValue ?? 0;
        totals.exposure += marketValue * (holding.leverage ?? 1);
        totals.marketValue += marketValue;
      }
    }
    byMonth.set(key, totals);
  }
  return byMonth;
};

/**
 * Months where every portfolio that has any history also has a snapshot. Portfolios
 * with no snapshots at all (newly created) are ignored so they cannot blank the series.
 */
const completeMonthsOf = (snapshotsPerPortfolio: PortfolioSnapshot[][]): Set<string> => {
  const monthsPerPortfolio = snapshotsPerPortfolio
    .map((snapshots) => new Set(snapshots.map(monthKeyOf)))
    .filter((months) => months.size > 0);
  const [first, ...rest] = monthsPerPortfolio;
  if (first === undefined) return new Set();
  return rest.reduce(
    (shared, months) => new Set([...shared].filter((month) => months.has(month))),
    first,
  );
};

/** One range per distinct set of months, preferring the requested range for its set. */
const buildAvailableRanges = (
  drawableMonths: string[],
  anchorYearMonth: string,
  requestedRange: AnalysisRange,
): AnalysisRange[] => {
  const representative = new Map<string, AnalysisRange>();
  for (const range of ANALYSIS_RANGES) {
    const signature = cutRange(drawableMonths, anchorYearMonth, range).join(',');
    if (!representative.has(signature) || range === requestedRange) {
      representative.set(signature, range);
    }
  }
  return ANALYSIS_RANGES.filter((range) => [...representative.values()].includes(range));
};

const cutRange = (months: string[], anchorYearMonth: string, range: AnalysisRange): string[] => {
  const anchorCode = toMonthCode(anchorYearMonth);
  if (range === 'all') {
    return months.filter((month) => toMonthCode(month) <= anchorCode);
  }
  const startCode = anchorCode - (RANGE_MONTHS[range] - 1);
  return months.filter((month) => {
    const code = toMonthCode(month);
    return code >= startCode && code <= anchorCode;
  });
};

/**
 * 歷史財務分析：把已產生報表與 portfolio snapshot 組裝成各區塊的可畫期間與 KPI。每個區塊只取自己有
 * 對應報表型別的月份，不檢查財務期間狀態（與儀表板的已關帳錨定刻意不同）；
 * 範圍終點固定錨點（最新有資產負債表的期間）。
 */
export class GetFinancialAnalysisWorkflow {
  private readonly listPeriods = new ListFinancialPeriodsUseCase();

  async execute({
    householdId,
    auth,
    range,
  }: GetFinancialAnalysisRequest): Promise<FinancialAnalysis> {
    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const [reports, periods] = await Promise.all([
      listReportsUseCase.execute({ householdId, auth }),
      this.listPeriods.execute({ householdId }),
    ]);
    const closedMonths = new Set(
      periods.filter((period) => period.status === 'CLOSED').map((period) => period.yearMonth),
    );

    const byType = {
      balanceSheet: reports.filter(isBalanceSheet),
      income: reports.filter(isIncome),
      cashFlow: reports.filter(isCashFlow),
    };

    const anchorReport = resolveAnchorReport(byType.balanceSheet);

    if (anchorReport === null) {
      return {
        anchor: null,
        kpis: EMPTY_KPIS,
        unclosedMonths: [],
        range,
        availableRanges: [],
        netWorthPoints: [],
        assetCompositionPoints: [],
        investmentPerformancePoints: [],
        incomePoints: [],
        cashFlowPoints: [],
        debtLeveragePoints: [],
        cashCoveragePoints: [],
      };
    }

    const portfolios = await listPortfoliosUseCase.execute({ householdId, auth });
    const snapshotsPerPortfolio = await Promise.all(
      portfolios.map((portfolio) =>
        listPortfolioSnapshotsUseCase.execute({ householdId, portfolioId: portfolio.id, auth }),
      ),
    );
    const snapshotsByMonth = aggregateSnapshots(snapshotsPerPortfolio.flat());
    // Household performance and leverage are only complete when every portfolio with
    // history also has that month's snapshot.
    const completeMonths = completeMonthsOf(snapshotsPerPortfolio);

    const anchor = anchorReport.yearMonth;
    const anchorClosed = closedMonths.has(anchor);
    const drawableMonths = [...new Set(reports.map((report) => report.yearMonth))].sort(
      (a, b) => toMonthCode(a) - toMonthCode(b),
    );

    const inRange = (month: string): boolean => cutRange([month], anchor, range).length > 0;

    const netWorthPoints = collectPoints(
      byType.balanceSheet,
      closedMonths,
      inRange,
      (report, closed) => ({
        yearMonth: report.yearMonth,
        closed,
        netWorth: report.data.assets.total - report.data.liabilities.total,
        assets: report.data.assets.total,
        liabilities: report.data.liabilities.total,
      }),
    );
    const assetCompositionPoints = collectPoints(
      byType.balanceSheet,
      closedMonths,
      inRange,
      (report, closed) => ({
        yearMonth: report.yearMonth,
        closed,
        assetsTotal: report.data.assets.total,
        cash: report.data.assets.groups.cash?.total ?? 0,
        investment: report.data.assets.groups.investment?.total ?? 0,
        property: report.data.assets.groups.property?.total ?? 0,
      }),
      (report) => report.data.assets.total > 0,
    );
    const investmentPerformancePoints = collectPoints(
      byType.balanceSheet,
      closedMonths,
      inRange,
      (report, closed) => {
        const month = snapshotsByMonth.get(report.yearMonth);
        const openingValue = month?.openingValue ?? 0;
        const gain = month?.gain ?? 0;
        return {
          yearMonth: report.yearMonth,
          closed,
          gain,
          openingValue,
          returnRate: openingValue > 0 ? (gain / openingValue) * 100 : null,
        };
      },
      (report) => completeMonths.has(report.yearMonth),
    );
    const debtLeveragePoints = collectPoints(
      byType.balanceSheet,
      closedMonths,
      inRange,
      (report, closed) => {
        const month = snapshotsByMonth.get(report.yearMonth);
        const assetsTotal = report.data.assets.total;
        const liabilities = report.data.liabilities.total;
        return {
          yearMonth: report.yearMonth,
          closed,
          liabilities,
          assetsTotal,
          debtRatio: assetsTotal > 0 ? (liabilities / assetsTotal) * 100 : null,
          leverage:
            month !== undefined && completeMonths.has(report.yearMonth) && month.marketValue > 0
              ? month.exposure / month.marketValue
              : null,
        };
      },
      (report) => report.data.assets.total > 0,
    );
    const incomePoints = collectPoints(byType.income, closedMonths, inRange, (report, closed) => ({
      yearMonth: report.yearMonth,
      closed,
      income: report.data.incomeTotal,
      expense: report.data.expenseTotal,
      savingsRate: savingsRateOf(report.data.incomeTotal, report.data.expenseTotal),
    }));
    const cashFlowPoints = collectPoints(
      byType.cashFlow,
      closedMonths,
      inRange,
      (report, closed) => ({
        yearMonth: report.yearMonth,
        closed,
        netCashFlow: report.data.netCashChange,
      }),
    );
    // The trailing window may reach outside the range: the range only cuts the axis.
    const expenseByMonth = new Map(
      byType.income.map((report) => [toMonthCode(report.yearMonth), report.data.expenseTotal]),
    );
    const cashCoveragePoints = collectPoints(
      byType.balanceSheet,
      closedMonths,
      inRange,
      (report, closed) => {
        const cash = report.data.assets.groups.cash?.total ?? 0;
        const codes = [0, 1, 2].map((back) => toMonthCode(report.yearMonth) - back);
        const complete = codes.every((code) => expenseByMonth.has(code));
        const expenseAverage = complete
          ? codes.reduce((sum, code) => sum + (expenseByMonth.get(code) ?? 0), 0) / 3
          : null;
        return {
          yearMonth: report.yearMonth,
          closed,
          cash,
          expenseAverage,
          coverageMonths:
            expenseAverage !== null && expenseAverage > 0 ? cash / expenseAverage : null,
        };
      },
    );

    const anchorIncome = byType.income.find((report) => report.yearMonth === anchor);
    const unclosedMonths = [
      ...new Set(
        [
          ...netWorthPoints,
          ...assetCompositionPoints,
          ...investmentPerformancePoints,
          ...incomePoints,
          ...cashFlowPoints,
          ...debtLeveragePoints,
          ...cashCoveragePoints,
        ].map((p) => p.yearMonth),
      ),
    ]
      .filter((month) => !closedMonths.has(month))
      .sort((a, b) => toMonthCode(a) - toMonthCode(b));

    return {
      anchor: { yearMonth: anchor, closed: anchorClosed },
      kpis: kpisOf(anchorReport, anchorIncome, closedMonths),
      unclosedMonths,
      range,
      availableRanges: buildAvailableRanges(drawableMonths, anchor, range),
      netWorthPoints,
      assetCompositionPoints,
      investmentPerformancePoints,
      incomePoints,
      cashFlowPoints,
      debtLeveragePoints,
      cashCoveragePoints,
    };
  }

  /**
   * Rescale the resolved analysis without another read. See `rollUpFinancialAnalysisUseCase`.
   */
  rollUp(analysis: FinancialAnalysis, granularity: AnalysisGranularity): FinancialAnalysis {
    return rollUpFinancialAnalysisUseCase.execute(analysis, granularity);
  }
}

export const getFinancialAnalysisWorkflow = new GetFinancialAnalysisWorkflow();
