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
 * The persisted value behind a figure. `previousAmount: null` is ambiguous on
 * its own — it means "equal to `amount`" for UNCHANGED, and "no persisted value"
 * for ADDED — so the status decides. Reading it as `previousAmount ?? amount`
 * (the old combine rule) made an ADDED operand count itself as its own previous
 * value, so a merged parent reported a persisted total it never had (#237).
 */
const persistedValueOf = (part: DriftAmount): number =>
  part.status === DRIFT_STATUS.ADDED ? 0 : (part.previousAmount ?? part.amount);

/** The three statements Step 8 owns, each carrying its drift annotations. */
export interface DriftStatements {
  incomeStatement: IncomeStatementDrift | null;
  balanceSheet: BalanceSheetDrift | null;
  cashFlow: CashFlowDrift | null;
}

const hasDriftedItems = (items: readonly DriftItem[]): boolean =>
  items.some((item) => isDrifted(item) || hasDriftedItems(item.subItems ?? []));

const hasDriftedGroups = (groups: Record<string, DriftGroup>): boolean =>
  Object.values(groups).some((group) => isDrifted(group.total) || hasDriftedItems(group.items));

const hasIncomeStatementDrift = (data: IncomeStatementDrift): boolean =>
  isDrifted(data.incomeTotal) ||
  isDrifted(data.expenseTotal) ||
  isDrifted(data.netIncome) ||
  hasDriftedItems(data.incomeItems) ||
  hasDriftedItems(data.expenseItems);

const hasBalanceSheetDrift = (data: BalanceSheetDrift): boolean =>
  [data.assets, data.liabilities, data.equity].some(
    (side) => isDrifted(side.total) || hasDriftedGroups(side.groups),
  );

const hasCashFlowDrift = (data: CashFlowDrift): boolean =>
  isDrifted(data.netCashChange) ||
  isDrifted(data.beginningBalance) ||
  isDrifted(data.endingBalance) ||
  isDrifted(data.actualBalance) ||
  isDrifted(data.adjustment) ||
  [data.operating, data.investing, data.financing].some(
    (group) =>
      isDrifted(group.total) ||
      hasDriftedItems(group.inflowItems) ||
      hasDriftedItems(group.outflowItems),
  );

/**
 * Whether any figure in Step 8's three statements drifted from the persisted
 * report — the front-end close gate (#234). Any drifting figure blocks the
 * close, so this reads the statements Step 8 owns rather than the five
 * aggregates Step 9 shows: a drifted child under an unchanged total is exactly
 * the case the gate exists for. It includes figures Step 8 compares but does not
 * draw as their own cell (期初/期末餘額, 調整數), because a stale one still has
 * to be resolved in Step 8 — missing it would be the failure mode this
 * prevents.
 *
 * Deliberately a boolean, not a count: the tree mixes independent figures with
 * render-time sums (現金流期初/期末/調整數, 負債 + 權益) whose drift is implied
 * by their operands, and the screen draws only some of them as cells. Any tally
 * would therefore disagree with what the user can count, so the block says
 * *that* the reports drifted and sends the user back to Step 8, rather than
 * naming a number it cannot justify.
 */
export const hasReportDrift = (statements: DriftStatements): boolean =>
  (statements.incomeStatement !== null && hasIncomeStatementDrift(statements.incomeStatement)) ||
  (statements.balanceSheet !== null && hasBalanceSheetDrift(statements.balanceSheet)) ||
  (statements.cashFlow !== null && hasCashFlowDrift(statements.cashFlow));

/**
 * Combine drift-annotated figures into their sum, for parent rows the report
 * does not persist (cash-flow inflow/outflow buckets, the balance sheet's
 * closing `負債 + 權益`). Drifted when any operand drifted, so a combined value
 * that happens to match never masks a child's drift.
 */
export const combineDrift = (parts: readonly DriftAmount[]): DriftAmount => {
  const amount = parts.reduce((sum, part) => sum + part.amount, 0);
  const previousAmount = parts.reduce((sum, part) => sum + persistedValueOf(part), 0);
  if (parts.every((part) => part.status === DRIFT_STATUS.UNCHANGED)) {
    return { amount, previousAmount: null, status: DRIFT_STATUS.UNCHANGED };
  }
  return { amount, previousAmount, status: DRIFT_STATUS.CHANGED };
};
