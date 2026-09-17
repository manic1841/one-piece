import { DASHBOARD_STAT_ROW_LABELS } from '@/ui/constants/dashboard/statRowLabels';
import { formatCurrency } from '@/ui/utils';

import type { DashboardOverview } from '@/application/dashboard/use_cases/getDashboardOverviewUseCase';
import type { NextMonthDebtDueResult } from '@/application/debt/use_cases/getNextMonthDebtDueUseCase';

export interface DashboardStatMetricVM {
  key: string;
  label: string;
  valueText: string;
  detailText: string | null;
}

export interface DashboardStatRowVM {
  metrics: DashboardStatMetricVM[];
}

export const mapDashboardOverviewToStatRowVM = (
  overview: DashboardOverview | null,
  nextMonthDue: NextMonthDebtDueResult | null,
): DashboardStatRowVM => {
  const anchor = overview?.anchor;

  const totalAssets: DashboardStatMetricVM = {
    key: 'totalAssets',
    label: DASHBOARD_STAT_ROW_LABELS.TOTAL_ASSETS,
    valueText: anchor ? formatCurrency(anchor.assets) : '—',
    detailText: anchor
      ? `${DASHBOARD_STAT_ROW_LABELS.ANCHOR_PREFIX} ${anchor.yearMonth}`
      : null,
  };

  const totalLiabilities: DashboardStatMetricVM = {
    key: 'totalLiabilities',
    label: DASHBOARD_STAT_ROW_LABELS.TOTAL_LIABILITIES,
    valueText: anchor ? formatCurrency(anchor.liabilities) : '—',
    detailText: null,
  };

  const nextMonthDebtDue: DashboardStatMetricVM = {
    key: 'nextMonthDebtDue',
    label: DASHBOARD_STAT_ROW_LABELS.NEXT_MONTH_DEBT_DUE,
    valueText: nextMonthDue ? formatCurrency(nextMonthDue.total) : '—',
    detailText: nextMonthDue?.yearMonth ?? null,
  };

  return { metrics: [totalAssets, totalLiabilities, nextMonthDebtDue] };
};
