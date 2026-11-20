/**
 * Financial reports (three types per report month, derived through the pure
 * report calculators) and the monthly close period matrix (docs/qa-seed-data.md §4).
 */
import {
  CLOSE_STAGE_IDS,
  CLOSE_STAGE_IDS_SET,
  type CloseStageId,
  type CloseStageState,
  FinancialPeriodSchema,
} from '@/domains/financial_period/schemas';
import type { JournalEntryLine } from '@/domains/ledger/schemas';
import {
  type BalanceSheetData,
  calculateBalanceSheet,
  calculateCashFlow,
  calculateIncomeStatement,
} from '@/domains/report/reportCalculations';
import { FinancialReportSchema, ReportType } from '@/domains/report/schemas';

import {
  type Builder,
  CAR_LOAN_ID,
  type InternalTxn,
  MORTGAGE_ID,
  REPORT_MONTHS,
  audit,
  cashThrough,
  cashThroughFor,
  emit,
  hh,
  marketValueAt,
  ym,
} from './shared';
import { STATIC_ACCOUNTS } from './staticDocs';

export const buildReportDocs = (
  b: Builder,
  txns: InternalTxn[],
  mortgageClosing: Record<string, number>,
  carClosing: Record<string, number>,
) => {
  const { identity } = b;
  const sorted = [...txns].sort((a, c) => a.date.getTime() - c.date.getTime());

  const entriesThrough = (target: string): JournalEntryLine[] =>
    sorted.filter((t) => t.yearMonth <= target).flatMap((t) => t.entries);
  const entriesIn = (target: string): JournalEntryLine[] =>
    sorted.filter((t) => t.yearMonth === target).flatMap((t) => t.entries);

  const previousMonth = (target: string) => {
    const [y, m] = target.split('-').map(Number);
    return ym(m === 1 ? y - 1 : y, m === 1 ? 12 : m - 1);
  };

  let prevBalanceSheet: BalanceSheetData | null = null;
  for (const target of REPORT_MONTHS) {
    const incomeStatement = calculateIncomeStatement({
      yearMonth: target,
      entries: entriesIn(target),
    });

    const balanceSheet = calculateBalanceSheet({
      yearMonth: target,
      entries: entriesThrough(target),
      monthlyEntries: entriesIn(target),
      accounts: STATIC_ACCOUNTS,
      portfolios: [{ id: 'pf_core', name: '核心投資組合' }],
      debtAccounts: [
        { id: MORTGAGE_ID, name: '玉山房貸' },
        { id: CAR_LOAN_ID, name: '車貸' },
      ],
      accountSnapshots: STATIC_ACCOUNTS.map(({ id }) => ({
        accountId: id,
        amount:
          id === 'acc_securities' ? marketValueAt(target) : cashThroughFor(sorted, id, target),
      })),
      debtSnapshots: [
        { debtId: MORTGAGE_ID, closingBalance: mortgageClosing[target] ?? 0 },
        { debtId: CAR_LOAN_ID, closingBalance: carClosing[target] ?? 0 },
      ],
      portfolioSnapshots: [
        { portfolioId: 'pf_core', gain: marketValueAt(target) - marketValueAt('2026-06') },
      ],
      prevBalanceSheet,
      incomeStatement,
    });
    prevBalanceSheet = balanceSheet;

    const cashFlow = calculateCashFlow({
      yearMonth: target,
      entries: entriesIn(target),
      beginningBalance: cashThrough(sorted, previousMonth(target)),
      actualBalance: cashThrough(sorted, target),
    });

    const reports = [
      { type: ReportType.INCOME_STATEMENT, data: incomeStatement },
      { type: ReportType.BALANCE_SHEET, data: balanceSheet },
      { type: ReportType.CASH_FLOW, data: cashFlow },
    ] as const;
    for (const report of reports) {
      const id = `${target}-${report.type}`;
      emit(b, FinancialReportSchema, hh(identity, 'reports'), id, {
        id,
        householdId: identity.householdId,
        yearMonth: target,
        type: report.type,
        data: report.data,
        ...audit(identity),
      });
    }
  }
};

// Monthly close period states (ADR-0050/0052/0066). The matrix covers the
// persisted shapes a QA run needs: a Completeness Check pause and closable
// months with all stages completed. 2026-09 is intentionally absent — it is the
// "not started closing" target for the E2E in issue #277 — as is 2026-05 and
// earlier (absence = has not started closing).
export const buildMonthlyCloseDocs = (b: Builder) => {
  const { identity } = b;

  const stageState = (status: 'PENDING' | 'COMPLETED', confirmedAt?: Date): CloseStageState =>
    confirmedAt ? { status, confirmedBy: identity.email, confirmedAt } : { status };

  const completedStages = (throughIndex: number, at: Date) =>
    Object.fromEntries(
      CLOSE_STAGE_IDS.map((stageId, index) => [
        stageId,
        index <= throughIndex ? stageState('COMPLETED', at) : stageState('PENDING'),
      ]),
    );

  const emitPeriod = (
    yearMonth: string,
    status: 'NEEDS_REVIEW' | 'CLOSED',
    stages: Record<string, CloseStageState>,
    reviewSourceStageId: CloseStageId | null = null,
  ) => {
    emit(b, FinancialPeriodSchema, hh(identity, 'financialPeriods'), yearMonth, {
      id: yearMonth,
      yearMonth,
      status,
      stages,
      reviewSourceStageId,
      ...audit(identity),
    });
  };

  // Legacy pause: persisted before the Completeness Check zero-activity source
  // was removed (ADR-0080). Keeps the legacy resolution path covered.
  emitPeriod(
    '2026-06',
    'NEEDS_REVIEW',
    completedStages(5, new Date(2026, 5, 28)),
    'COMPLETENESS_CHECK',
  );

  // Finalized months: the reopen dialog and cascade demotion (ADR-0066) targets.
  emitPeriod(
    '2026-07',
    'CLOSED',
    completedStages(CLOSE_STAGE_IDS.length - 1, new Date(2026, 6, 31)),
  );
  emitPeriod(
    '2026-08',
    'CLOSED',
    completedStages(CLOSE_STAGE_IDS.length - 1, new Date(2026, 7, 31)),
  );

  // 2026-09 is deliberately NOT seeded with a period record: it is the only
  // month whose account/portfolio/project/debt snapshots are all present, so it
  // is the target for the "close from a period that has not been started" E2E
  // (issue #277). Its reports stay seeded, so the close run also covers the
  // "reports existed before any close record" path (CONTEXT §已產生報表).
  // A period record is created by the user pressing 開始關帳; do not "restore"
  // it here. 2026-05 and earlier are likewise absent (not started closing).

  // Period count and stage IDs are asserted here so a stage rename in
  // schemas.ts breaks the seeder instead of the QA run.
  const seeded = b.docs.filter((doc) => doc.collectionPath.endsWith('/financialPeriods'));
  if (seeded.length !== 3) {
    throw new Error(`expected 3 financial periods, built ${seeded.length}`);
  }
  for (const period of seeded) {
    const stageIds = Object.keys((period.data as { stages: Record<string, unknown> }).stages);
    if (!stageIds.every((stageId) => CLOSE_STAGE_IDS_SET.has(stageId))) {
      throw new Error(`unknown stage id in ${period.id}: ${stageIds.join(', ')}`);
    }
  }
};
