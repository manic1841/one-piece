/**
 * #282: the close pipeline must not change the numbers.
 *
 * The three claims behind a close are already guarded separately — inputs build
 * the request payload (unit), the payload persists documents (integration), and
 * the report calculators compute correctly (unit). What no lower layer guards is
 * the *chain*: the deterministic QA golden dataset (scripts/qa/plan, 206 docs)
 * run through the full monthly close, after which the persisted `financialReports`
 * must still equal what the pure report calculators derive from the very same
 * snapshots.
 *
 * The golden fixtures are that oracle: `scripts/qa/plan/reportDocs.ts` builds the
 * three reports by feeding the golden snapshots to `calculateIncomeStatement` /
 * `calculateBalanceSheet` / `calculateCashFlow`, so re-deriving them here from the
 * same plan reproduces the fixture numbers through the calculators.
 *
 * The test carries its own dataset: `pnpm test:integration`'s `resetMockDb()`
 * wipes the emulator before every test and does not restore the QA seed, so the
 * plan is built and written here through the client SDK (never `scripts/qa/seed-qa-data.ts`,
 * which is bound to firebase-admin + a `qa:init` prerequisite).
 */
import { type DocumentData, Timestamp, doc, setDoc } from 'firebase/firestore';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  type MonthlyCloseConfirmRequest,
  type MonthlyCloseStartRequest,
  monthlyCloseWorkflowUseCase,
} from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { getSettlementReadinessUseCase } from '@/application/report/use_cases/getSettlementReadinessUseCase';
import { type AuthContext } from '@/application/types';
import { type CloseStageId } from '@/domains/financial_period/schemas';
import { type JournalEntryLine } from '@/domains/ledger/schemas';
import {
  type BalanceSheetData,
  type CashFlowData,
  calculateBalanceSheet,
  calculateCashFlow,
  calculateIncomeStatement,
  calculateLiquidBalance,
} from '@/domains/report/reportCalculations';
import { ReportType } from '@/domains/report/schemas';
import { financialPeriodRepository } from '@/infra/repositories/financialPeriodRepository';
import { reportRepository } from '@/infra/repositories/reportRepository';
import { TEST_USER as auth } from '@/test/factories';
import { db, resetMockDb } from '@/test/mocks/firebase';

import { type SeedDoc, buildQaSeedPlan } from '../../../../scripts/qa/plan';

const PERIOD = '2026-09';
const PREV_PERIOD = '2026-08';
const USER_EMAIL = 'user@example.com';

const yearOf = (yearMonth: string) => Number(yearMonth.slice(0, 4));
const monthOf = (yearMonth: string) => Number(yearMonth.slice(5, 7));

// ── Writing the golden dataset (client SDK) ──────────────────────────────────

// The plan emits JS Dates (zod contracts) and explicit `undefined` optional
// fields; the client SDK rejects both. Convert Dates to Timestamps and drop
// undefined keys so the plan docs land byte-for-byte on what they describe.
const toFirestoreValue = (value: unknown): unknown => {
  if (value instanceof Date) return Timestamp.fromDate(value);
  if (Array.isArray(value)) return value.map(toFirestoreValue);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry === undefined) continue;
      out[key] = toFirestoreValue(entry);
    }
    return out;
  }
  return value;
};

const writeGoldenDataset = async (docs: SeedDoc[]): Promise<void> => {
  const chunkSize = 50;
  for (let i = 0; i < docs.length; i += chunkSize) {
    await Promise.all(
      docs
        .slice(i, i + chunkSize)
        .map((seedDoc) =>
          setDoc(
            doc(db, seedDoc.collectionPath, seedDoc.id),
            toFirestoreValue(seedDoc.data) as DocumentData,
            { merge: true },
          ),
        ),
    );
  }
};

// ── Reading the plan as the report oracle ────────────────────────────────────

const monthOfDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

interface Oracle {
  incomeStatement: ReturnType<typeof calculateIncomeStatement>;
  balanceSheet: BalanceSheetData;
  cashFlow: CashFlowData;
}

const buildOracle = (docs: SeedDoc[]): Oracle => {
  const transactionDocs = docs.filter((d) => d.collectionPath.endsWith('/transactions'));
  const entriesOf = (d: SeedDoc) => (d.data as { entries: JournalEntryLine[] }).entries;
  const dateOf = (d: SeedDoc) => (d.data as { date: Date }).date;
  const entriesIn = (target: string) =>
    transactionDocs.filter((d) => monthOfDate(dateOf(d)) === target).flatMap(entriesOf);
  const entriesThrough = (target: string) =>
    transactionDocs.filter((d) => monthOfDate(dateOf(d)) <= target).flatMap(entriesOf);

  const accounts = docs
    .filter((d) => d.collectionPath.endsWith('/accounts'))
    .map((d) => d.data as { id: string; name: string; category: string });
  const portfolios = docs
    .filter((d) => d.collectionPath.endsWith('/portfolios'))
    .map((d) => {
      const { id, name } = d.data as { id: string; name: string };
      return { id, name };
    });
  const debtAccounts = docs
    .filter((d) => d.collectionPath.endsWith('/debtAccounts'))
    .map((d) => {
      const { id, name } = d.data as { id: string; name: string };
      return { id, name };
    });

  const accountSnapshots = docs
    .filter((d) => /\/accounts\/[^/]+\/snapshots$/.test(d.collectionPath) && d.id === PERIOD)
    .map((d) => {
      const { accountId, amount } = d.data as { accountId: string; amount: number };
      return { accountId, amount };
    });
  const debtSnapshots = docs
    .filter((d) => /\/debtAccounts\/[^/]+\/snapshots$/.test(d.collectionPath) && d.id === PERIOD)
    .map((d) => ({
      debtId: /\/debtAccounts\/([^/]+)\/snapshots$/.exec(d.collectionPath)![1]!,
      closingBalance: (d.data as { closingBalance: number }).closingBalance,
    }));
  const portfolioSnapshots = docs
    .filter((d) => /\/portfolios\/[^/]+\/snapshots$/.test(d.collectionPath) && d.id === PERIOD)
    .map((d) => ({
      portfolioId: /\/portfolios\/([^/]+)\/snapshots$/.exec(d.collectionPath)![1]!,
      gain: (d.data as { performance?: { gain?: number } }).performance?.gain ?? 0,
    }));

  const fixtureReport = (type: ReportType, target: string): unknown =>
    docs.find(
      (d) =>
        (d.data as { type?: string }).type === type &&
        (d.data as { yearMonth?: string }).yearMonth === target,
    )?.data.data;

  const incomeStatement = calculateIncomeStatement({
    yearMonth: PERIOD,
    entries: entriesIn(PERIOD),
  });
  const balanceSheet = calculateBalanceSheet({
    yearMonth: PERIOD,
    entries: entriesThrough(PERIOD),
    monthlyEntries: entriesIn(PERIOD),
    accounts,
    portfolios,
    debtAccounts,
    accountSnapshots,
    debtSnapshots,
    portfolioSnapshots,
    // The prior month's balance sheet chains equity, exactly as the pipeline
    // reads it back from the persisted 2026-08 report.
    prevBalanceSheet: fixtureReport(ReportType.BALANCE_SHEET, PREV_PERIOD) as BalanceSheetData,
    incomeStatement,
  });
  const cashFlow = calculateCashFlow({
    yearMonth: PERIOD,
    entries: entriesIn(PERIOD),
    // The pipeline opens from the persisted prior cash-flow report's actual
    // balance, which the fixture carries.
    beginningBalance: (fixtureReport(ReportType.CASH_FLOW, PREV_PERIOD) as CashFlowData)
      .actualBalance,
    actualBalance: calculateLiquidBalance(accounts, accountSnapshots),
  });

  return { incomeStatement, balanceSheet, cashFlow };
};

// ── Walking the close ────────────────────────────────────────────────────────

type ConfirmStageInput = Omit<
  MonthlyCloseConfirmRequest,
  keyof MonthlyCloseStartRequest | 'stageId'
>;

describe('golden-dataset close — emulator integration (#282)', () => {
  let householdId = '';

  const confirmStage = (stageId: CloseStageId, input: ConfirmStageInput = {}) =>
    monthlyCloseWorkflowUseCase.confirmStage({
      householdId,
      yearMonth: PERIOD,
      userEmail: USER_EMAIL,
      auth: auth as AuthContext,
      stageId,
      ...input,
    });

  beforeEach(async () => {
    await resetMockDb();
    householdId = `household-golden-${crypto.randomUUID()}`;
  });

  it('closes the period with reports that still equal the snapshot-derived numbers', async () => {
    const docs = buildQaSeedPlan({ uid: auth.uid, email: USER_EMAIL, householdId });
    await writeGoldenDataset(docs);
    const oracle = buildOracle(docs);

    // The golden month is the one whose snapshots are all present, so it is
    // ready to close before anything is started (issue #277).
    await expect(
      getSettlementReadinessUseCase.execute({
        householdId,
        auth: auth as AuthContext,
        year: yearOf(PERIOD),
        month: monthOf(PERIOD),
      }),
    ).resolves.toMatchObject({ isReady: true });

    await monthlyCloseWorkflowUseCase.start({
      householdId,
      yearMonth: PERIOD,
      userEmail: USER_EMAIL,
      auth: auth as AuthContext,
    });

    // ACCOUNT_BALANCE: re-record the golden account observations (same values).
    const accountBalances = docs
      .filter((d) => /\/accounts\/[^/]+\/snapshots$/.test(d.collectionPath) && d.id === PERIOD)
      .map((d) => {
        const data = d.data as {
          accountId: string;
          amount: number;
          holdings?: unknown;
          originalAmount?: number;
          exchangeRate?: number;
        };
        return {
          accountId: data.accountId,
          amount: data.amount,
          ...(data.holdings !== undefined ? { holdings: data.holdings } : {}),
          ...(data.originalAmount !== undefined ? { originalAmount: data.originalAmount } : {}),
          ...(data.exchangeRate !== undefined ? { exchangeRate: data.exchangeRate } : {}),
        };
      });
    await confirmStage('ACCOUNT_BALANCE', { accountBalances });

    // No new trades or cash flows: the golden journal for 2026-09 is the input.
    await confirmStage('SECURITIES_TRADE', {
      securities: { buys: [], sells: [] },
      financing: { shareholderFinancing: [], dividendPayout: [] },
    });
    const portfolioSnapshot = docs.find(
      (d) => /\/portfolios\/[^/]+\/snapshots$/.test(d.collectionPath) && d.id === PERIOD,
    );
    const portfolioId = /\/portfolios\/([^/]+)\/snapshots$/.exec(
      portfolioSnapshot!.collectionPath,
    )![1]!;
    await confirmStage('PORTFOLIO_CASH_FLOW', {
      portfolioCashFlows: {
        [portfolioId]: (
          portfolioSnapshot!.data as { cashFlow: { deposits: number; withdrawals: number } }
        ).cashFlow,
      },
    });
    await confirmStage('PROJECT_SETTLEMENT', {});
    // The golden 2026-09 debt snapshots are already settled; the stage settles
    // only the accounts missing a snapshot (none), so it changes nothing.
    // Submitting repayment rows would re-book on top of the seeded snapshot
    // (the seed writes no operation records), corrupting the dataset.
    await confirmStage('DEBT_REPAYMENT', { repayments: [] });
    await confirmStage('COMPLETENESS_CHECK', {});

    // FINANCIAL_REPORTS regenerates all three reports from the persisted state.
    await confirmStage('FINANCIAL_REPORTS', {});
    await confirmStage('CLOSE_PERIOD', {});

    const period = await financialPeriodRepository.getPeriod(householdId, PERIOD);
    expect(period?.status).toBe('CLOSED');

    // The persisted reports must reproduce the snapshot-derived numbers.
    const readPersisted = async (type: ReportType) => {
      const report = await reportRepository.getReport(householdId, PERIOD, type);
      expect(report, `${type} report`).not.toBeNull();
      return report!.data;
    };

    const incomeStatement = (await readPersisted(ReportType.INCOME_STATEMENT)) as {
      incomeTotal: number;
      expenseTotal: number;
      netIncome: number;
    };
    expect(incomeStatement.incomeTotal).toBeCloseTo(oracle.incomeStatement.incomeTotal, 2);
    expect(incomeStatement.expenseTotal).toBeCloseTo(oracle.incomeStatement.expenseTotal, 2);
    expect(incomeStatement.netIncome).toBeCloseTo(oracle.incomeStatement.netIncome, 2);

    const balanceSheet = (await readPersisted(ReportType.BALANCE_SHEET)) as BalanceSheetData;
    expect(balanceSheet.assets.total).toBeCloseTo(oracle.balanceSheet.assets.total, 2);
    expect(balanceSheet.liabilities.total).toBeCloseTo(oracle.balanceSheet.liabilities.total, 2);
    expect(balanceSheet.equity.total).toBeCloseTo(oracle.balanceSheet.equity.total, 2);

    const cashFlow = (await readPersisted(ReportType.CASH_FLOW)) as CashFlowData;
    expect(cashFlow.netCashChange).toBeCloseTo(oracle.cashFlow.netCashChange, 2);
    expect(cashFlow.endingBalance).toBeCloseTo(oracle.cashFlow.endingBalance, 2);
    expect(cashFlow.actualBalance).toBeCloseTo(oracle.cashFlow.actualBalance, 2);
  });
});
