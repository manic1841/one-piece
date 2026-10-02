import type {
  DashboardNetWorthPoint,
  DashboardOverview,
} from '@/application/dashboard/use_cases/getDashboardOverviewUseCase';
import type { ChartPoint } from '@/ui/components/charts/chartInteraction';
import { formatCurrency, formatYearMonth } from '@/ui/utils';

export type { DashboardComposition } from '@/application/dashboard/use_cases/getDashboardOverviewUseCase';

export interface DashboardHeroTrendVM {
  values: number[];
  labels: string[];
  points: ChartPoint[];
  hasData: boolean;
}

export interface DashboardHeroVM {
  hasAnchor: boolean;
  anchorPeriodText: string | null;
  netWorthText: string;
  ytd: {
    percentText: string;
    amountText: string | null;
    direction: 'positive' | 'negative';
  } | null;
  /** Net-worth series backing the hero trend chart. */
  trend: DashboardHeroTrendVM;
}

const MONTH_NAMES = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

export const mapDashboardOverviewToHeroVM = (
  overview: DashboardOverview | null,
): DashboardHeroVM => {
  if (!overview?.anchor) {
    return {
      hasAnchor: false,
      anchorPeriodText: null,
      netWorthText: '—',
      ytd: null,
      trend: { values: [], labels: [], points: [], hasData: false },
    };
  }

  const anchor = overview.anchor;
  const [year, month] = anchor.yearMonth.split('-').map(Number);

  return {
    hasAnchor: true,
    anchorPeriodText: `${formatYearMonth(year, month)} REPORT`,
    netWorthText: formatCurrency(anchor.netWorth),
    ytd: buildYtdVM(anchor.netWorth, anchor.ytdBaseline?.netWorth ?? null),
    trend: buildTrendVM(anchor.netWorthSeries),
  };
};

const buildYtdVM = (netWorth: number, baselineNetWorth: number | null): DashboardHeroVM['ytd'] => {
  if (baselineNetWorth === null) {
    return { percentText: '—', amountText: null, direction: 'positive' };
  }
  const change = netWorth - baselineNetWorth;
  const percent = (change / baselineNetWorth) * 100;
  const direction = change >= 0 ? 'positive' : 'negative';
  const signedPercentText = `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`;
  return {
    percentText: `${signedPercentText} YTD`,
    amountText: `${change >= 0 ? '+' : '-'}${formatCurrency(Math.abs(change))}`,
    direction,
  };
};

const buildTrendVM = (series: DashboardNetWorthPoint[]): DashboardHeroTrendVM => {
  const present = series.filter(
    (point): point is DashboardNetWorthPoint & { netAssets: number } => point.netAssets !== null,
  );
  const values = present.map((point) => point.netAssets);
  const labels = present.map((point) => `${MONTH_NAMES[point.month - 1]} ${point.year}`);
  return {
    values,
    labels,
    points: values.map((value, index) => ({
      title: labels[index],
      value: formatCurrency(value),
      meta: formatMonthOverMonth(values, index),
    })),
    hasData: present.length > 0,
  };
};

/** Month-over-month change relative to the previous point; the first point has no baseline. */
/** Month-over-month change relative to the previous point; the first point has no baseline. */
const formatMonthOverMonth = (values: number[], index: number): string => {
  const previous = values[index - 1];
  if (previous === undefined || previous === 0) {
    return '—';
  }
  const percent = ((values[index] - previous) / previous) * 100;
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}% MoM`;
};
