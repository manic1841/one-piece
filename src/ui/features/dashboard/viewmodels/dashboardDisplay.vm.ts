import { type LeverageStats } from '@/application/portfolio/use_cases/getLeverageStatsUseCase';
import { formatCurrency } from '@/ui/utils';

export interface LeverageStatsCardVM {
  ratio: number;
  ratioText: string;
  totalExposureText: string;
  totalNetValueText: string;
  statusColorClass: string;
  progressColorClass: string;
  progressWidth: number;
}

const EMPTY_LEVERAGE_STATS: LeverageStats = {
  ratio: 0,
  totalExposure: 0,
  totalNetValue: 0,
};

const getStatusColorClass = (ratio: number) => {
  if (ratio <= 1.05) return 'text-positive';
  if (ratio <= 1.5) return 'text-warning';
  return 'text-negative';
};

const getProgressColorClass = (ratio: number) => {
  if (ratio <= 1.05) return 'bg-positive';
  if (ratio <= 1.5) return 'bg-warning';
  return 'bg-negative';
};

export const mapLeverageStatsToCardVM = (stats: LeverageStats | null): LeverageStatsCardVM => {
  const base = stats ?? EMPTY_LEVERAGE_STATS;
  const ratio = base.ratio;

  return {
    ratio,
    ratioText: `${ratio.toFixed(2)}x`,
    totalExposureText: formatCurrency(base.totalExposure),
    totalNetValueText: formatCurrency(base.totalNetValue),
    statusColorClass: getStatusColorClass(ratio),
    progressColorClass: getProgressColorClass(ratio),
    progressWidth: Math.min((ratio / 2) * 100, 100),
  };
};

export interface DebtSummaryCardVM {
  totalDebtText: string;
  monthlyPaymentText: string;
  unpaidCountText: string;
  unpaidUnitText: string;
  unpaidContainerClassName: string;
  unpaidIconClassName: string;
  unpaidLabelClassName: string;
  unpaidCountClassName: string;
  unpaidUnitClassName: string;
  isUnpaid: boolean;
}

export const mapDebtSummaryToCardVM = (
  totalDebt: number,
  monthlyPaymentTotal: number,
  unpaidCount: number,
): DebtSummaryCardVM => {
  const isUnpaid = unpaidCount > 0;

  return {
    totalDebtText: formatCurrency(Math.round(totalDebt)),
    monthlyPaymentText: formatCurrency(Math.round(monthlyPaymentTotal)),
    unpaidCountText: String(unpaidCount),
    unpaidUnitText: '筆',
    unpaidContainerClassName: isUnpaid
      ? 'bg-negative/10 border-negative/20'
      : 'bg-positive/10 border-positive/20',
    unpaidIconClassName: isUnpaid ? 'bg-negative/15 text-negative' : 'bg-positive/15 text-positive',
    unpaidLabelClassName: isUnpaid ? 'text-negative' : 'text-positive',
    unpaidCountClassName: isUnpaid ? 'text-negative' : 'text-positive',
    unpaidUnitClassName: isUnpaid ? 'text-negative' : 'text-positive',
    isUnpaid,
  };
};
