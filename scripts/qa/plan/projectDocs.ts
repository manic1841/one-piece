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
  REPORT_MONTHS,
  SEED_WINDOW_END,
  SEED_WINDOW_START,
  audit,
  emit,
  hh,
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

export const buildPortfolioSnapshotDocs = (b: Builder) => {
  const { identity } = b;
  let cumulativeGain = 0;
  let prevValue = marketValueAt('2026-06');
  securitiesSnapshotMonths()
    .filter((target) => REPORT_MONTHS.includes(target))
    .forEach((target) => {
      const [y, m] = target.split('-').map(Number);
      const closingValue = marketValueAt(target);
      const gain = closingValue - prevValue;
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
            holdings: [{ symbol: '0050', name: '元大台灣50', cost: 50, marketValue: closingValue }],
          },
        ],
        totalValue: closingValue,
        cashFlow: { deposits: 0, withdrawals: 0 },
        performance: {
          openingValue: prevValue,
          closingValue,
          netCashFlow: 0,
          gain,
          returnRate: Number(((gain / prevValue) * 100).toFixed(2)),
          cumulativeGain,
          cumulativeReturnRate: Number(((cumulativeGain / 20_000) * 100).toFixed(2)),
        },
        ...audit(identity),
      });
      prevValue = closingValue;
    });
};
