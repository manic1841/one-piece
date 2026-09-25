/**
 * Financial reports (three types per report month, derived through the pure
 * report calculators) and the monthly close period matrix (docs/qa-seed-data.md §4).
 */
import {
  CLOSE_STAGE_IDS,
  CLOSE_STAGE_IDS_SET,
  FinancialPeriodSchema,
  type CloseStageId,
  type CloseStageState,
} from '@/domains/financial_period/schemas';
import { FinancialReportSchema, ReportType } from '@/domains/report/schemas';
import {
  calculateBalanceSheet,
  calculateCashFlow,
  calculateIncomeStatement,
  type BalanceSheetData,
} from '@/domains/report/reportCalculations';
import type { JournalEntryLine } from '@/domains/ledger/schemas';

import {
  audit,
  cashThrough,
  emit,
  hh,
  MORTGAGE_ID,
  marketValueAt,
  REPORT_MONTHS,
  ym,
  type Builder,
  type InternalTxn,
} from './shared';
import { STATIC_ACCOUNTS } from './staticDocs';

export const buildReportDocs = (b: Builder, txns: InternalTxn[], mortgageClosing: Record<string, number>) => {
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
    const incomeStatement = calculateIncomeStatement({ yearMonth: target, entries: entriesIn(target) });

    const balanceSheet = calculateBalanceSheet({
      yearMonth: target,
      entries: entriesThrough(target),
      monthlyEntries: entriesIn(target),
      accounts: STATIC_ACCOUNTS,
      portfolios: [{ id: 'pf_core', name: '核心投資組合' }],
      debtAccounts: [{ id: MORTGAGE_ID, name: '玉山房貸' }],
      accountSnapshots: [
        { accountId: 'acc_cash', amount: cashThrough(sorted, target) },
        { accountId: 'acc_securities', amount: marketValueAt(target) },
      ],
      debtSnapshots: [{ debtId: MORTGAGE_ID, closingBalance: mortgageClosing[target] ?? 0 }],
      portfolioSnapshots: [{ portfolioId: 'pf_core', gain: marketValueAt(target) - marketValueAt('2026-06') }],
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

// Monthly close period states (ADR-0050/0052/0066). The matrix covers every
// persisted shape a QA run needs: a Completeness Check pause, closable months
// with all nine stages completed, and an active close mid-workflow. No record
// is seeded for 2026-05 and earlier (absence = has not started closing).
export const buildMonthlyCloseDocs = (b: Builder) => {
  const { identity } = b;

  const stageState = (
    status: 'PENDING' | 'COMPLETED',
    confirmedAt?: Date,
  ): CloseStageState => (confirmedAt ? { status, confirmedBy: identity.email, confirmedAt } : { status });

  const completedStages = (throughIndex: number, at: Date) =>
    Object.fromEntries(
      CLOSE_STAGE_IDS.map((stageId, index) => [
        stageId,
        index <= throughIndex ? stageState('COMPLETED', at) : stageState('PENDING'),
      ]),
    );

  const emitPeriod = (
    yearMonth: string,
    status: 'IN_PROGRESS' | 'NEEDS_REVIEW' | 'CLOSED',
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

  // Paused on the Completeness Check zero-activity anomaly.
  emitPeriod('2026-06', 'NEEDS_REVIEW', completedStages(5, new Date(2026, 5, 28)), 'COMPLETENESS_CHECK');

  // Finalized months: the reopen dialog and cascade demotion (ADR-0066) targets.
  emitPeriod('2026-07', 'CLOSED', completedStages(CLOSE_STAGE_IDS.length - 1, new Date(2026, 6, 31)));
  emitPeriod('2026-08', 'CLOSED', completedStages(CLOSE_STAGE_IDS.length - 1, new Date(2026, 7, 31)));

  // Active close: first five stages confirmed, validation evidence pending.
  emitPeriod('2026-09', 'IN_PROGRESS', completedStages(4, new Date(2026, 8, 12)));

  // Unused stage IDs must fail the seed loudly; assert the record shape here
  // so a stage rename in schemas.ts breaks the seeder instead of the QA run.
  const seeded = b.docs.filter((doc) => doc.collectionPath.endsWith('/financialPeriods'));
  if (seeded.length !== 4) {
    throw new Error(`expected 4 financial periods, built ${seeded.length}`);
  }
  for (const period of seeded) {
    const stageIds = Object.keys((period.data as { stages: Record<string, unknown> }).stages);
    if (!stageIds.every((stageId) => CLOSE_STAGE_IDS_SET.has(stageId))) {
      throw new Error(`unknown stage id in ${period.id}: ${stageIds.join(', ')}`);
    }
  }
};
