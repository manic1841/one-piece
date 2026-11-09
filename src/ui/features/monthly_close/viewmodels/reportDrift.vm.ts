import {
  type BalanceSheetDrift,
  type CashFlowDrift,
  DRIFT_STATUS,
  type DriftAmount,
  type DriftGroup,
  type DriftItem,
  type IncomeStatementDrift,
} from '@/domains/report/reportDrift';
import { REPORT_DRIFT_EDGE_LABELS } from '@/ui/constants/report/reportMetricLabels';
import { formatCurrency } from '@/ui/utils';

/** Display formatting for Report Drift; the domain owns the comparison (ADR-0062). */

export type {
  BalanceSheetDrift,
  CashFlowDrift,
  DriftAmount,
  DriftGroup,
  DriftItem,
  IncomeStatementDrift,
};

export { combineDrift } from '@/domains/report/reportDrift';

/** Whether the figure drifted from the persisted report and needs the warning colour. */
export const isDrifted = (drift: DriftAmount | undefined): boolean =>
  drift !== undefined && drift.status !== DRIFT_STATUS.UNCHANGED;

/** The `<persisted> -> <preview>` text, or null when the cell renders a plain amount. */
export const formatDriftDelta = (drift: DriftAmount): string | null => {
  switch (drift.status) {
    case DRIFT_STATUS.UNCHANGED:
      return null;
    case DRIFT_STATUS.ADDED:
      return `${formatCurrency(0)} -> ${formatCurrency(drift.amount)}`;
    case DRIFT_STATUS.REMOVED:
      return `${formatCurrency(drift.previousAmount ?? 0)} -> ${formatCurrency(0)}`;
    default:
      if (drift.previousAmount === null || drift.previousAmount === drift.amount) return null;
      return `${formatCurrency(drift.previousAmount)} -> ${formatCurrency(drift.amount)}`;
  }
};

/** The amount text for any drift state: the delta when it drifted, else the amount. */
export const formatDriftAmountText = (drift: DriftAmount): string =>
  formatDriftDelta(drift) ?? formatCurrency(drift.amount);

/**
 * The two labelled ends of a drifted figure, for surfaces with no room for the
 * `a -> b` one-liner (the phone row prints them on their own line).
 */
export const formatDriftEdges = (drift: DriftAmount): { fromText: string; toText: string } => ({
  fromText: formatCurrency(drift.previousAmount ?? 0),
  toText: formatCurrency(drift.amount),
});

/** The phone row's second line: both ends wired together, one wording for every surface. */
export const formatDriftEdgeLine = (edges: { fromText: string; toText: string }): string =>
  `${REPORT_DRIFT_EDGE_LABELS.FROM} ${edges.fromText} → ${REPORT_DRIFT_EDGE_LABELS.TO} ${edges.toText}`;
