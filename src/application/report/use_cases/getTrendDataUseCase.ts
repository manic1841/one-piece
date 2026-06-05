import { listPortfolioSnapshotsUseCase } from '@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase';
import { listPortfoliosUseCase } from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import { ReportType } from '@/domains/report/schemas';
import { type TrendDataPoint } from '@/domains/report/types';
import { logger } from '@/utils/logger';

import { listReportsUseCase } from './listReportsUseCase';

const parseYearMonth = (yearMonth: string) => {
  const [year, month] = yearMonth.split('-').map(Number);
  return { year, month };
};

const toYearMonthKey = (year: number, month: number): string =>
  `${year}-${String(month).padStart(2, '0')}`;

interface GetTrendDataRequest {
  householdId: string;
  auth: {
    uid: string;
    isGlobalAdmin: boolean;
  };
}

class GetTrendDataUseCase {
  async execute(request: GetTrendDataRequest): Promise<TrendDataPoint[]> {
    const { householdId, auth } = request;
    logger.info('getTrendDataUseCase.start', 'Report');

    const [allReports, portfolios] = await Promise.all([
      listReportsUseCase.execute({ householdId, auth }),
      listPortfoliosUseCase.execute({ householdId, auth }),
    ]);

    if (allReports.length === 0) {
      return [];
    }

    // Sort reports by time
    const sortedReports = [...allReports].sort((a, b) => {
      const aParts = parseYearMonth(a.yearMonth);
      const bParts = parseYearMonth(b.yearMonth);
      if (aParts.year !== bParts.year) return aParts.year - bParts.year;
      return aParts.month - bParts.month;
    });

    const now = new Date();
    const currentCode = now.getFullYear() * 100 + (now.getMonth() + 1);

    const monthlyPoints: TrendDataPoint[] = [];

    const reportsByTypeAndMonth = new Map<string, (typeof allReports)[number]>();
    for (const report of allReports) {
      reportsByTypeAndMonth.set(`${report.type}:${report.yearMonth}`, report);
    }

    const portfolioSnapshotsByMonth = new Map<string, { gain: number; openingValue: number }>();
    await Promise.all(
      portfolios.map(async (portfolio) => {
        const snapshots = await listPortfolioSnapshotsUseCase.execute({
          householdId,
          portfolioId: portfolio.id,
        });

        for (const snapshot of snapshots) {
          const key = toYearMonthKey(snapshot.year, snapshot.month);
          const current = portfolioSnapshotsByMonth.get(key) ?? { gain: 0, openingValue: 0 };
          portfolioSnapshotsByMonth.set(key, {
            gain: current.gain + (snapshot.performance?.gain ?? 0),
            openingValue: current.openingValue + (snapshot.performance?.openingValue ?? 0),
          });
        }
      }),
    );

    // Iterate from the earliest report to now
    const first = parseYearMonth(sortedReports[0].yearMonth);
    let iterYear = first.year;
    let iterMonth = first.month;

    while (iterYear * 100 + iterMonth <= currentCode) {
      const year = iterYear;
      const month = iterMonth;

      const lookupYearMonth = toYearMonthKey(year, month);
      const incomeReport = reportsByTypeAndMonth.get(
        `${ReportType.INCOME_STATEMENT}:${lookupYearMonth}`,
      );
      const balanceReport = reportsByTypeAndMonth.get(
        `${ReportType.BALANCE_SHEET}:${lookupYearMonth}`,
      );

      const portfolioSnapshot = portfolioSnapshotsByMonth.get(lookupYearMonth);
      const hasPortfolioData = Boolean(portfolioSnapshot);
      const periodInvestmentGain = portfolioSnapshot?.gain ?? 0;
      const periodOpeningValue = portfolioSnapshot?.openingValue ?? 0;

      // Extract income by category
      const incomeByCategory: Record<string, number> = {};
      if (incomeReport && 'incomeItems' in incomeReport.data) {
        incomeReport.data.incomeItems.forEach((item: { code: string; amount: number }) => {
          incomeByCategory[item.code] = (incomeByCategory[item.code] || 0) + item.amount;
        });
      }

      monthlyPoints.push({
        year,
        month,
        income:
          incomeReport && 'incomeTotal' in incomeReport.data ? incomeReport.data.incomeTotal : null,
        incomeByCategory,
        expense:
          incomeReport && 'expenseTotal' in incomeReport.data
            ? incomeReport.data.expenseTotal
            : null,
        totalAssets:
          balanceReport && 'assets' in balanceReport.data ? balanceReport.data.assets.total : null,
        liabilities:
          balanceReport && 'liabilities' in balanceReport.data
            ? balanceReport.data.liabilities.total
            : null,
        netAssets:
          balanceReport && 'assets' in balanceReport.data && 'liabilities' in balanceReport.data
            ? balanceReport.data.assets.total - balanceReport.data.liabilities.total
            : null,
        investmentGain: hasPortfolioData ? periodInvestmentGain : null,
        investmentReturnRate:
          hasPortfolioData && periodOpeningValue > 0
            ? (periodInvestmentGain / periodOpeningValue) * 100
            : null,
      });

      iterMonth++;
      if (iterMonth > 12) {
        iterMonth = 1;
        iterYear++;
      }
    }

    return monthlyPoints;
  }
}

export const getTrendDataUseCase = new GetTrendDataUseCase();
