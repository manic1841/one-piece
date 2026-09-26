/**
 * Project settlement snapshots (ADR-0012: opening balances chain from the
 * first month even though only report-month snapshots are persisted) and
 * portfolio snapshots for the report months.
 */
import { PortfolioSnapshotSchema } from '@/domains/portfolio/schemas';
import { calculateProjectSettlementSnapshot } from '@/domains/project/calculators/projectSettlementCalculator';
import { ProjectSnapshotSchema } from '@/domains/project/schemas';

import {
  type AllocationJournal,
  type Builder,
  type InternalTxn,
  PORTFOLIO_BASE_VALUE,
  REPORT_MONTHS,
  SEED_WINDOW_END,
  SEED_WINDOW_START,
  audit,
  emit,
  hh,
  holdingsAt,
  marketValueAt,
  monthRange,
  securitiesSnapshotMonths,
  ym,
} from './shared';
import { STATIC_PROJECT_IDS } from './staticDocs';

export const buildProjectSnapshotDocs = (
  b: Builder,
  txns: InternalTxn[],
  allocations: AllocationJournal[],
) => {
  const { identity } = b;
  const sorted = [...txns].sort((a, c) => a.date.getTime() - c.date.getTime());

  // Project settlement snapshots. ADR-0012: opening balances must chain from
  // the first month even though only REPORT_MONTHS snapshots are persisted.
  for (const projectId of STATIC_PROJECT_IDS) {
    let opening = 0;
    for (const { year, month } of monthRange(SEED_WINDOW_START, SEED_WINDOW_END)) {
      const target = ym(year, month);
      const snap = calculateProjectSettlementSnapshot({
        year,
        month,
        projectId,
        openingBalance: opening,
        allocations: allocations.filter((a) => a.yearMonth === target),
        transfers: sorted.filter(
          (t) => t.yearMonth === target && (t.fromProjectId || t.toProjectId),
        ),
        projectTransactions: sorted.filter(
          (t) => t.yearMonth === target && t.projectId === projectId,
        ),
      });
      opening = snap.closingBalance;
      if (REPORT_MONTHS.includes(target)) {
        emit(b, ProjectSnapshotSchema, hh(identity, 'projects', projectId, 'snapshots'), target, {
          id: target,
          ...snap,
          ...audit(identity),
        });
      }
    }
  }
};

export const buildPortfolioSnapshotDocs = (b: Builder, txns: InternalTxn[]) => {
  const { identity } = b;
  const sorted = [...txns].sort((a, c) => a.date.getTime() - c.date.getTime());
  const monthlyCashFlow = (target: string) => {
    const yearMonth = target;
    return sorted
      .filter((t) => t.yearMonth === yearMonth && t.intentType === 'INVESTMENT')
      .reduce((sum, t) => sum + (t.amount ?? 0), 0);
  };
  let cumulativeGain = 0;
  let prevValue = PORTFOLIO_BASE_VALUE;
  securitiesSnapshotMonths()
    .filter((target) => REPORT_MONTHS.includes(target))
    .forEach((target) => {
      const [y, m] = target.split('-').map(Number);
      const closingValue = marketValueAt(target);
      const deposits = monthlyCashFlow(target);
      const gain = closingValue - prevValue - deposits;
      cumulativeGain += gain;
      emit(b, PortfolioSnapshotSchema, hh(identity, 'portfolios', 'pf_core', 'snapshots'), target, {
        id: target,
        year: y,
        month: m,
        accounts: [
          {
            accountId: 'acc_securities',
            accountName: '券商帳戶',
            category: 'securities',
            value: closingValue,
            holdings: holdingsAt(target),
          },
        ],
        totalValue: closingValue,
        cashFlow: { deposits, withdrawals: 0 },
        performance: {
          openingValue: prevValue,
          closingValue,
          netCashFlow: deposits,
          gain,
          returnRate: Number(((gain / prevValue) * 100).toFixed(2)),
          cumulativeGain,
          cumulativeReturnRate: Number(((cumulativeGain / PORTFOLIO_BASE_VALUE) * 100).toFixed(2)),
        },
        ...audit(identity),
      });
      prevValue = closingValue;
    });
};
