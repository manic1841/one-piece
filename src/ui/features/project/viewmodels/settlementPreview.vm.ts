import { type WatchListTargetType, buildWatchListDocId } from '@/domains/watch_list/schemas';
import { formatCurrency } from '@/ui/utils';

export interface SettlementPreviewItemVM {
  projectId: string;
  projectName: string;
  openingBalance: number;
  income: number;
  expense: number;
  closingBalance: number;
  openingBalanceText: string;
  incomeText: string;
  expenseText: string;
  closingBalanceText: string;
}

export const mapSettlementToPreviewVM = (settlement: {
  projectId: string;
  projectName: string;
  openingBalance: number;
  income: number;
  expense: number;
  closingBalance: number;
}): SettlementPreviewItemVM => {
  return {
    ...settlement,
    openingBalanceText: formatCurrency(settlement.openingBalance),
    incomeText: formatCurrency(settlement.income),
    expenseText: formatCurrency(settlement.expense),
    closingBalanceText: formatCurrency(settlement.closingBalance),
  };
};

/**
 * View model for one completeness anomaly row in the settlement selection step.
 * Projected from the completeness use case result (ui-layer-architecture:
 * views consume VMs, not application DTOs).
 */
export interface CompletenessAnomalyVM {
  /** Stable session key for confirmation tracking. */
  key: string;
  targetType: WatchListTargetType;
  targetId: string;
  name: string;
  activityCount: number;
  activityAmount: number;
}

export const mapAnomalyToVM = (anomaly: {
  targetType: WatchListTargetType;
  targetId: string;
  name: string;
  activityCount: number;
  activityAmount: number;
}): CompletenessAnomalyVM => ({
  key: buildWatchListDocId(anomaly.targetType, anomaly.targetId),
  targetType: anomaly.targetType,
  targetId: anomaly.targetId,
  name: anomaly.name,
  activityCount: anomaly.activityCount,
  activityAmount: anomaly.activityAmount,
});
