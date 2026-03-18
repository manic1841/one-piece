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

    // Iterate from the earliest report to now
    const first = parseYearMonth(sortedReports[0].yearMonth);
    let iterYear = first.year;
    let iterMonth = first.month;

    while (iterYear * 100 + iterMonth <= currentCode) {
      const year = iterYear;
      const month = iterMonth;

      const lookupYearMonth = `${year}-${String(month).padStart(2, '0')}`;
      const incomeReport = allReports.find(
        (r) => r.type === ReportType.INCOME_STATEMENT && r.yearMonth === lookupYearMonth,
      );
      const balanceReport = allReports.find(
        (r) => r.type === ReportType.BALANCE_SHEET && r.yearMonth === lookupYearMonth,
      );

      // Fetch investment gains across all portfolios
      let periodInvestmentGain = 0;
      let hasPortfolioData = false;

      // Optimize: In a real scenario, we'd batch fetch snapshots
      for (const portfolio of portfolios) {
        const snapshots = await listPortfolioSnapshotsUseCase.execute({
          householdId,
          portfolioId: portfolio.id,
          year,
          month,
          auth,
        });
        if (snapshots.length > 0) {
          periodInvestmentGain += snapshots[0].performance.gain;
          hasPortfolioData = true;
        }
      }

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
        investmentGain: hasPortfolioData ? periodInvestmentGain : null,
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
