import { DASHBOARD_PULSE_LABELS } from '@/ui/constants/dashboard/pulseLabels';
import { formatCurrency, formatPercentage } from '@/ui/utils';
import type { DashboardOverview } from '@/application/dashboard/use_cases/getDashboardOverviewUseCase';

export interface DashboardPulseMetricVM {
  key: string;
  label: string;
  valueText: string;
  detailText: string | null;
  valueClassName: string;
}

export interface DashboardPulseVM {
  metrics: DashboardPulseMetricVM[];
}

const POSITIVE_CLASS = 'text-positive';
const NEGATIVE_CLASS = 'text-negative';

export const mapDashboardOverviewToPulseVM = (
  overview: DashboardOverview | null,
): DashboardPulseVM => {
  const pulse = overview?.pulse;

  if (!pulse) {
    return { metrics: [] };
  }

  const netCashFlow: DashboardPulseMetricVM = {
    key: 'netCashFlow',
    label: DASHBOARD_PULSE_LABELS.NET_CASH_FLOW,
    valueText: pulse.netCashFlow === null ? '—' : formatCurrency(pulse.netCashFlow),
    detailText: null,
    valueClassName:
      pulse.netCashFlow === null
        ? ''
        : pulse.netCashFlow >= 0
          ? POSITIVE_CLASS
          : NEGATIVE_CLASS,
  };

  const investmentReturn: DashboardPulseMetricVM = {
    key: 'investmentReturn',
    label: DASHBOARD_PULSE_LABELS.INVESTMENT_RETURN,
    valueText: pulse.investmentReturn === null ? '—' : formatPercentage(pulse.investmentReturn, 2),
    detailText:
      pulse.investmentReturn === null || pulse.investmentGain === null
        ? null
        : `${DASHBOARD_PULSE_LABELS.GAIN_PREFIX} ${formatCurrency(pulse.investmentGain)}`,
    valueClassName: '',
  };

  const investmentLeverage: DashboardPulseMetricVM = {
    key: 'investmentLeverage',
    label: DASHBOARD_PULSE_LABELS.INVESTMENT_LEVERAGE,
    valueText: pulse.investmentLeverage === null ? '—' : `${pulse.investmentLeverage.toFixed(2)}x`,
    detailText: null,
    valueClassName: '',
  };

  const monthlyDebtPayment: DashboardPulseMetricVM = {
    key: 'monthlyDebtPayment',
    label: DASHBOARD_PULSE_LABELS.MONTHLY_DEBT_PAYMENT,
    valueText:
      pulse.monthlyDebtPayment === null ? '—' : formatCurrency(pulse.monthlyDebtPayment),
    detailText: null,
    valueClassName: '',
  };

  return { metrics: [netCashFlow, investmentReturn, investmentLeverage, monthlyDebtPayment] };
};
