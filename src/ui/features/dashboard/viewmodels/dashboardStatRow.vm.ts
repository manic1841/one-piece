import type { DashboardOverview } from '@/application/dashboard/use_cases/getDashboardOverviewUseCase';
import { type MoneyTone } from '@/ui/components/moneyTone';
import { DASHBOARD_STAT_ROW_LABELS } from '@/ui/constants/dashboard/statRowLabels';
import { formatCurrency, formatPercentage } from '@/ui/utils';

export interface DashboardStatMetricVM {
  key: string;
  label: string;
  valueText: string;
  detailText: string | null;
  tone: MoneyTone;
}

export interface DashboardStatRowVM {
  sectionTitle: string;
  metrics: DashboardStatMetricVM[];
}

const GAIN_PREFIX = '損益';

const pulseText = (value: number | null | undefined, format: (value: number) => string): string =>
  value === null || value === undefined ? '—' : format(value);

const pulseTone = (value: number | null | undefined): MoneyTone =>
  value === null || value === undefined ? 'default' : value >= 0 ? 'positive' : 'negative';

export const mapDashboardOverviewToStatRowVM = (
  overview: DashboardOverview | null,
): DashboardStatRowVM => {
  const anchor = overview?.anchor;
  const pulse = overview?.pulse;

  const totalAssets: DashboardStatMetricVM = {
    key: 'totalAssets',
    label: DASHBOARD_STAT_ROW_LABELS.TOTAL_ASSETS,
    valueText: anchor ? formatCurrency(anchor.assets) : '—',
    detailText: anchor ? `${DASHBOARD_STAT_ROW_LABELS.ANCHOR_PREFIX} ${anchor.yearMonth}` : null,
    tone: 'default',
  };

  const totalLiabilities: DashboardStatMetricVM = {
    key: 'totalLiabilities',
    label: DASHBOARD_STAT_ROW_LABELS.TOTAL_LIABILITIES,
    valueText: anchor ? formatCurrency(anchor.liabilities) : '—',
    detailText: null,
    tone: 'default',
  };

  const monthlyCashFlow: DashboardStatMetricVM = {
    key: 'monthlyCashFlow',
    label: DASHBOARD_STAT_ROW_LABELS.MONTHLY_CASH_FLOW,
    valueText: pulseText(pulse?.netCashFlow, formatCurrency),
    detailText: null,
    tone: pulseTone(pulse?.netCashFlow),
  };

  const portfolioReturn: DashboardStatMetricVM = {
    key: 'portfolioReturn',
    label: DASHBOARD_STAT_ROW_LABELS.PORTFOLIO_RETURN,
    valueText: pulseText(pulse?.investmentReturn, (value) => formatPercentage(value, 2)),
    detailText:
      pulse?.investmentReturn == null || pulse?.investmentGain == null
        ? null
        : `${GAIN_PREFIX} ${formatCurrency(pulse.investmentGain)}`,
    tone: 'default',
  };

  const investmentLeverage: DashboardStatMetricVM = {
    key: 'investmentLeverage',
    label: DASHBOARD_STAT_ROW_LABELS.INVESTMENT_LEVERAGE,
    valueText: pulseText(pulse?.investmentLeverage, (value) => `${value.toFixed(2)}x`),
    detailText: null,
    tone: 'default',
  };

  return {
    sectionTitle: DASHBOARD_STAT_ROW_LABELS.SECTION_TITLE,
    metrics: [totalAssets, totalLiabilities, monthlyCashFlow, portfolioReturn, investmentLeverage],
  };
};
