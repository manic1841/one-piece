import {
  type BalanceSheetDrift,
  type CashFlowDrift,
  DRIFT_STATUS,
  type DriftAmount,
  type DriftGroup,
  type DriftItem,
  type IncomeStatementDrift,
} from '@/domains/report/reportDrift';
import { formatCurrency } from '@/ui/utils';

/**
 * Report Drift display helpers. The domain computes the status and values; this
 * module turns them into the `<persisted> -> <preview>` text the UI renders. It
 * is also the Surface tier's type surface for the drift trees, so components
 * never reach into the domain directly.
 */

export type {
  BalanceSheetDrift,
  CashFlowDrift,
  DriftAmount,
  DriftGroup,
  DriftItem,
  IncomeStatementDrift,
};

/** Whether the figure drifted from the persisted report and needs the warning colour. */
export const isDrifted = (drift: DriftAmount | undefined): boolean =>
  drift !== undefined && drift.status !== DRIFT_STATUS.UNCHANGED;

/**
 * The `<persisted> -> <preview>` text for a drifted figure, or null when the
 * amount cell should render a plain amount (unchanged, or a restructured parent
 * whose total happens to match — the warning colour alone carries the signal).
 */
export const formatDriftDelta = (drift: DriftAmount): string | null => {
  switch (drift.status) {
    case DRIFT_STATUS.UNCHANGED:
      return null;
    case DRIFT_STATUS.ADDED:
      return `0 -> ${formatCurrency(drift.amount)}`;
    case DRIFT_STATUS.REMOVED:
      return `${formatCurrency(drift.previousAmount ?? 0)} -> 0`;
    default:
      if (drift.previousAmount === null || drift.previousAmount === drift.amount) return null;
      return `${formatCurrency(drift.previousAmount)} -> ${formatCurrency(drift.amount)}`;
  }
};

/**
 * Combine drift-annotated figures into their sum, for parent rows the report
 * does not persist (cash-flow inflow/outflow buckets, the balance sheet's
 * closing `負債 + 權益`). Drifted when any operand drifted, so a combined value
 * that happens to match never masks a child's drift.
 */
export const combineDrift = (parts: readonly DriftAmount[]): DriftAmount => {
  const amount = parts.reduce((sum, part) => sum + part.amount, 0);
  const previousAmount = parts.reduce((sum, part) => sum + (part.previousAmount ?? part.amount), 0);
  if (parts.every((part) => part.status === DRIFT_STATUS.UNCHANGED)) {
    return { amount, previousAmount: null, status: DRIFT_STATUS.UNCHANGED };
  }
  return { amount, previousAmount, status: DRIFT_STATUS.CHANGED };
};
