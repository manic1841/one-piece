import { type FinancialReport, ReportType, type TrendDataPoint } from '@/domains/finance/types';
import { reportRepository } from '@/repositories/reportRepository';
import { portfolioService } from '@/services/portfolioService';
import { logger } from '@/utils/logger';

class FinancialTrendService {
  /**
   * Get historical trend data for assets, income, expenses, and investment gains
   */
  async getTrendData(householdId: string): Promise<TrendDataPoint[]> {
    logger.info('getTrendData.start', 'FinancialTrendService');
    const [allReports, portfolios] = await Promise.all([
      reportRepository.list([householdId]),
      portfolioService.getPortfolios(householdId),
    ]);

    if (allReports.length === 0) {
      return [];
    }

    // Find the earliest report
    const sortedReports = [...allReports].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    const now = new Date();
    const currentCode = now.getFullYear() * 100 + (now.getMonth() + 1);

    const monthlyPoints: TrendDataPoint[] = [];

    // 1. Collect monthly raw data from first report to now
    let iterYear = sortedReports[0].year;
    let iterMonth = sortedReports[0].month;

    while (iterYear * 100 + iterMonth <= currentCode) {
      const year = iterYear;
      const month = iterMonth;

      const incomeReport = allReports.find(
        (r: FinancialReport) =>
          r.type === ReportType.INCOME_STATEMENT && r.year === year && r.month === month,
      );
      const balanceReport = allReports.find(
        (r: FinancialReport) =>
          r.type === ReportType.BALANCE_SHEET && r.year === year && r.month === month,
      );

      // Fetch investment gains across all portfolios
      let periodInvestmentGain = 0;
      let hasPortfolioData = false;

      // Note: In a real scenario, we'd query all snapshots once and group them
      for (const portfolio of portfolios) {
        const snapshots = await portfolioService.getSnapshots(
          householdId,
          portfolio.id,
          year,
          month,
        );
        if (snapshots.length > 0) {
          periodInvestmentGain += snapshots[0].performance.gain;
          hasPortfolioData = true;
        }
      }

      // Extract income by category from income statement items
      const incomeByCategory: Record<string, number> = {};
      if (incomeReport && 'revenue' in incomeReport.data) {
        incomeReport.data.revenue.items.forEach((item) => {
          incomeByCategory[item.category] = (incomeByCategory[item.category] || 0) + item.amount;
        });
      }

      monthlyPoints.push({
        year,
        month,
        income:
          incomeReport && 'revenue' in incomeReport.data ? incomeReport.data.revenue.total : null,
        incomeByCategory,
        expense:
          incomeReport && 'expenses' in incomeReport.data ? incomeReport.data.expenses.total : null,
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

    logger.info('getTrendData.rawPoints', 'FinancialTrendService');
    return monthlyPoints;
  }
}

export const financialTrendService = new FinancialTrendService();
