import { deleteApp, initializeApp } from 'firebase/app';
import {
  type Firestore,
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocsFromServer,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { createDebtAccountUseCase } from '@/application/debt/use_cases/createDebtAccountUseCase';
import {
  type MonthlyCloseConfirmRequest,
  type MonthlyCloseStartRequest,
  monthlyCloseWorkflowUseCase,
} from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { createPortfolioUseCase } from '@/application/portfolio/use_cases/createPortfolioUseCase';
import { listPortfoliosUseCase } from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import { createProjectUseCase } from '@/application/project/use_cases/createProjectUseCase';
import { getReportPersistenceStateUseCase } from '@/application/report/use_cases/getReportPersistenceStateUseCase';
import { addWatchListTargetUseCase } from '@/application/watch_list/use_cases/addWatchListTargetUseCase';
import type { CloseStageId } from '@/domains/financial_period/schemas';
import { CLOSE_STAGE_IDS } from '@/domains/financial_period/schemas';
import { ReportType } from '@/domains/report/schemas';
import { financialPeriodRepository } from '@/infra/repositories/financialPeriodRepository';
import { projectRepository } from '@/infra/repositories/projectRepository';
import { reportRepository } from '@/infra/repositories/reportRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';
import { emulatorProjectId, firestoreEmulator } from '@/test/emulatorEnv';
import { db, resetMockDb } from '@/test/mocks/firebase';

const auth = { uid: 'user-1', email: 'user@example.com', isGlobalAdmin: true };
const yearMonth = '2026-03';

const roundAmount = (value: number): number => Math.round(value * 100) / 100;
const amount = 12_345.67;

let householdSeq = 0;
let householdId = '';
let loanId = '';
let zeroPaymentLoanId = '';
let portfolioId = '';
let projectId = '';

const nextHouseholdId = () => `household-close-flow-${householdSeq}`;

/**
 * Runs a read against a fresh reader app: the long-lived shared instance
 * serves stale local snapshots after transaction deletes on this SDK version,
 * so server reads after a delete go through a throwaway connection.
 */
const withFreshReader = async <T>(read: (readerDb: Firestore) => Promise<T>): Promise<T> => {
  const readerApp = initializeApp(
    { projectId: emulatorProjectId },
    `reader-${crypto.randomUUID()}`,
  );
  const readerDb = getFirestore(readerApp);
  connectFirestoreEmulator(readerDb, firestoreEmulator.host, firestoreEmulator.port);
  try {
    return await read(readerDb);
  } finally {
    await deleteApp(readerApp);
  }
};

const seedAccount = async (id: string, category: string = 'cash') => {
  await setDoc(doc(db, 'households', householdId, 'accounts', id), {
    id,
    name: `Account ${id}`,
    category,
    currency: 'TWD',
    order: 0,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: 'user@example.com',
    updatedBy: 'user@example.com',
  });
};

type ConfirmStageInput = Omit<
  MonthlyCloseConfirmRequest,
  keyof MonthlyCloseStartRequest | 'stageId'
>;

const confirmStage = (stageId: CloseStageId, input: ConfirmStageInput = {}) =>
  monthlyCloseWorkflowUseCase.confirmStage({
    householdId: householdId,
    yearMonth,
    userEmail: 'user@example.com',
    auth,
    stageId,
    ...input,
  });

const expectDebtRepaymentArtifacts = async () => {
  const repaymentTransaction = await findTransactionByIntentOrIntentType('DEBT_PAYMENT');
  expect(repaymentTransaction).not.toBeNull();
  expect(repaymentTransaction?.debtAccountId).toBe(loanId);
  expect(repaymentTransaction?.amount).toBe(35_000);

  const loanSnapshot = await getDoc(
    doc(db, 'households', householdId, 'debtAccounts', loanId, 'snapshots', yearMonth),
  );
  expect(loanSnapshot.exists()).toBe(true);
  expect(loanSnapshot.data()?.totalPaid).toBe(35_000);

  const loanAccount = await getDoc(doc(db, 'households', householdId, 'debtAccounts', loanId));
  // CreateDebtAccount seeds currentBalance from originalAmount (the borrow
  // disbursement), so the loan closes from 1,200,000 minus this month's
  // principal share of the 35,000 payment.
  const monthlyInterest = roundAmount(1_200_000 * (2.1 / 100 / 12));
  expect(loanAccount.data()?.currentBalance).toBe(1_200_000 - (35_000 - monthlyInterest));

  const zeroPaymentSnapshot = await getDoc(
    doc(db, 'households', householdId, 'debtAccounts', zeroPaymentLoanId, 'snapshots', yearMonth),
  );
  expect(zeroPaymentSnapshot.exists()).toBe(true);
  expect(zeroPaymentSnapshot.data()?.totalPaid).toBe(0);
  expect(zeroPaymentSnapshot.data()?.principalPaid).toBe(0);
  expect(zeroPaymentSnapshot.data()?.interestPaid).toBe(0);
};

// Re-confirming the debt stage re-books the month's record (ADR-0067): the
// same period × account key with a changed payload deletes the previous
// transaction and re-derives the snapshot and balance inside one atomic
// boundary; the watched zero-payment snapshot stays untouched. Reads go
// through a fresh reader because the long-lived shared instance serves stale
// local snapshots after transaction deletes on this SDK version.
const expectRebookedDebtArtifacts = async (previousTransactionId: string) => {
  const rebooked = await withFreshReader(async (readerDb) => {
    const rebookedTransactions = await getDocsFromServer(
      query(
        collection(readerDb, 'households', householdId, 'transactions'),
        where('intentType', '==', 'DEBT_PAYMENT'),
        where('date', '>=', new Date(2026, 2, 1)),
        where('date', '<', new Date(2026, 3, 1)),
      ),
    );
    const rebookedSnapshot = await getDoc(
      doc(readerDb, 'households', householdId, 'debtAccounts', loanId, 'snapshots', yearMonth),
    );
    const zeroPaymentSnapshot = await getDoc(
      doc(
        readerDb,
        'households',
        householdId,
        'debtAccounts',
        zeroPaymentLoanId,
        'snapshots',
        yearMonth,
      ),
    );
    return { rebookedTransactions, rebookedSnapshot, zeroPaymentSnapshot };
  });
  expect(rebooked.rebookedTransactions.docs).toHaveLength(1);
  expect(rebooked.rebookedTransactions.docs[0]!.id).not.toBe(previousTransactionId);
  expect(rebooked.rebookedTransactions.docs[0]!.data().amount).toBe(36_000);
  expect(rebooked.rebookedSnapshot.data()?.totalPaid).toBe(36_000);
  expect(rebooked.zeroPaymentSnapshot.data()?.totalPaid).toBe(0);
  expect(rebooked.zeroPaymentSnapshot.data()?.principalPaid).toBe(0);
  expect(rebooked.zeroPaymentSnapshot.data()?.interestPaid).toBe(0);
  return rebooked.rebookedTransactions.docs[0]!.id;
};

/**
 * #222 regression: reopening keeps the persisted reports (they are the drift
 * baseline), so the reports stage returns to PENDING while the three report
 * docs still exist. Re-running the reports stage regenerates them and the
 * period closes again — the reopened path is not a dead end.
 */
const expectReopenRecloses = async () => {
  await monthlyCloseWorkflowUseCase.reopen({
    householdId: householdId,
    yearMonth,
    userEmail: 'user@example.com',
    auth,
  });
  let period = await financialPeriodRepository.getPeriod(householdId, yearMonth);
  expect(period?.status).toBe('IN_PROGRESS');
  expect(period?.stages.FINANCIAL_REPORTS.status).toBe('PENDING');
  await expect(
    getReportPersistenceStateUseCase.execute({ householdId: householdId, yearMonth }),
  ).resolves.toMatchObject({ isPersisted: true });

  await confirmStage('FINANCIAL_REPORTS', {});
  period = await financialPeriodRepository.getPeriod(householdId, yearMonth);
  expect(period?.stages.FINANCIAL_REPORTS.status).toBe('COMPLETED');

  await confirmStage('CLOSE_PERIOD', {});
  period = await financialPeriodRepository.getPeriod(householdId, yearMonth);
  expect(period?.status).toBe('CLOSED');
};

describe('monthlyCloseWorkflowUseCase — emulator integration', () => {
  beforeEach(async () => {
    await resetMockDb();
    householdSeq += 1;
    householdId = nextHouseholdId();

    await seedAccount('acc-1');
    await seedAccount('acc-securities', 'securities');
    await createPortfolioUseCase.execute({
      householdId: householdId,
      portfolio: {
        name: 'Brokerage',
        securitiesAccountId: 'acc-securities',
        bankAccountId: 'acc-1',
        isActive: true,
        order: 0,
      },
      userEmail: 'user@example.com',
      auth,
    });
    portfolioId = (await listPortfoliosUseCase.execute({ householdId: householdId, auth }))[0]!.id;
    await createProjectUseCase.execute({
      householdId: householdId,
      data: {
        name: 'Renovation',
        description: '',
        color: '#000000',
        icon: 'default',
        order: 0,
        category: 'OPERATING',
        isActive: true,
      },
      userEmail: 'user@example.com',
      auth,
    });
    projectId = (await projectRepository.getProjects(householdId))[0]!.id;
    loanId = await createDebtAccountUseCase.execute({
      householdId: householdId,
      data: {
        name: 'Loan paid in month',
        type: 'mortgage',
        repaymentType: 'equal_payment',
        originalAmount: 1_200_000,
        currentBalance: 900_000,
        interestRate: 2.1,
        startDate: new Date(2025, 0, 1),
        endDate: new Date(2035, 0, 1),
        graceEndDate: null,
        monthlyPayment: 35_000,
        linkedProjectId: null,
        isActive: true,
      },
      userEmail: 'user@example.com',
      auth,
    });
    zeroPaymentLoanId = await createDebtAccountUseCase.execute({
      householdId: householdId,
      data: {
        name: 'Loan with no payment',
        type: 'mortgage',
        repaymentType: 'equal_payment',
        originalAmount: 800_000,
        currentBalance: 600_000,
        interestRate: 1.8,
        startDate: new Date(2025, 0, 1),
        endDate: new Date(2035, 0, 1),
        graceEndDate: null,
        monthlyPayment: 25_000,
        linkedProjectId: null,
        isActive: true,
      },
      userEmail: 'user@example.com',
      auth,
    });

    await addWatchListTargetUseCase.execute({
      householdId: householdId,
      target: {
        targetType: 'DEBT_ACCOUNT',
        targetId: zeroPaymentLoanId,
        name: 'Loan with no payment',
      },
      userEmail: 'user@example.com',
      auth,
    });
  });

  it('walks start -> stage confirmations -> NEEDS_REVIEW -> resolved -> CLOSED', async () => {
    // OPEN via absence
    expect(await financialPeriodRepository.getPeriod(householdId, yearMonth)).toBeNull();

    await monthlyCloseWorkflowUseCase.start({
      householdId: householdId,
      yearMonth,
      userEmail: 'user@example.com',
      auth,
    });

    let period = await financialPeriodRepository.getPeriod(householdId, yearMonth);
    expect(period).not.toBeNull();
    expect(period?.status).toBe('IN_PROGRESS');
    expect(Object.keys(period?.stages ?? {})).toHaveLength(CLOSE_STAGE_IDS.length);
    expect(Object.values(period?.stages ?? {}).every((stage) => stage.status === 'PENDING')).toBe(
      true,
    );

    // ACCOUNT_BALANCE records snapshots for the seeded accounts.
    await confirmStage('ACCOUNT_BALANCE', {
      accountBalances: [
        { accountId: 'acc-1', amount },
        { accountId: 'acc-securities', amount },
      ],
    });
    const accountSnapshot = await getDoc(
      doc(db, 'households', householdId, 'accounts', 'acc-1', 'snapshots', yearMonth),
    );
    expect(accountSnapshot.exists()).toBe(true);
    expect(accountSnapshot.data()?.amount).toBe(amount);

    // Re-confirming the stage rewrites the month snapshots by period key
    // instead of refusing (the observation was corrected).
    await confirmStage('ACCOUNT_BALANCE', {
      accountBalances: [
        { accountId: 'acc-1', amount: 99_000 },
        { accountId: 'acc-securities', amount },
      ],
    });
    const rewrittenSnapshot = await getDoc(
      doc(db, 'households', householdId, 'accounts', 'acc-1', 'snapshots', yearMonth),
    );
    expect(rewrittenSnapshot.exists()).toBe(true);
    expect(rewrittenSnapshot.data()?.amount).toBe(99_000);
    expect(
      (
        await getDocsFromServer(
          collection(db, 'households', householdId, 'accounts', 'acc-1', 'snapshots'),
        )
      ).docs.length,
    ).toBe(1);

    // TRANSACTION_VALIDATION batch-checks the month's transactions and
    // completes without creating or modifying data (spec 05 stage 02).
    await confirmStage('TRANSACTION_VALIDATION', {});

    // SECURITIES_TRADE creates a SECURITY_BUY (INVESTMENT intentType) transaction.
    const buyDate = new Date(2026, 2, 10);
    await confirmStage('SECURITIES_TRADE', {
      securities: { buys: [{ amount, date: buyDate, description: 'VTI buy' }], sells: [] },
    });
    const buyTransaction = await findTransactionByIntentOrIntentType('SECURITY_BUY');
    expect(buyTransaction).not.toBeNull();
    expect(buyTransaction?.amount).toBe(amount);
    expect(buyTransaction?.intentType).toBe('INVESTMENT');
    expect(buyTransaction?.intent).toBe('SECURITY_BUY');

    // PORTFOLIO_CASH_FLOW creates a portfolio snapshot for March 2026 with
    // the deposited amount (input is keyed by portfolio document ID).
    await confirmStage('PORTFOLIO_CASH_FLOW', {
      portfolioCashFlows: { [portfolioId]: { deposits: amount, withdrawals: 0 } },
    });
    const portfolioSnapshot = await getDoc(
      doc(db, 'households', householdId, 'portfolios', portfolioId, 'snapshots', yearMonth),
    );
    expect(portfolioSnapshot.exists()).toBe(true);
    expect(portfolioSnapshot.data()?.cashFlow).toEqual({ deposits: amount, withdrawals: 0 });

    // PROJECT_SETTLEMENT creates a project snapshot for March 2026.
    await confirmStage('PROJECT_SETTLEMENT', {});
    const projectSnapshot = await getDoc(
      doc(db, 'households', householdId, 'projects', projectId, 'snapshots', yearMonth),
    );
    expect(projectSnapshot.exists()).toBe(true);

    // DEBT_REPAYMENT creates the atomic repayment artifacts for the loan paid
    // in month (transaction, snapshot, and currentBalance update), plus the
    // zero-payment snapshot for the watched loan with no repayment.
    await confirmStage('DEBT_REPAYMENT', {
      repayments: [
        {
          debtAccountId: loanId,
          totalPayment: 35_000,
          date: new Date(2026, 2, 5),
          projectId: null,
        },
      ],
    });
    await expectDebtRepaymentArtifacts();

    // One DEBT_REPAYMENT confirmation wrote both artifacts together: the
    // repayment transaction above and the zero-payment snapshot for the
    // watched loan with no repayment (issue #155).

    // Capture the booked transaction id before re-confirming.
    const firstBookings = await transactionRepository.listDebtPaymentsByDateRange(
      householdId,
      new Date(2026, 2, 1),
      new Date(2026, 3, 1),
    );
    expect(firstBookings).toHaveLength(1);
    const previousTransactionId = firstBookings[0]!.id;

    // Re-confirming the debt stage re-books the month's record; the
    // zero-payment snapshot for the watched loan stays untouched.
    await confirmStage('DEBT_REPAYMENT', {
      repayments: [
        {
          debtAccountId: loanId,
          totalPayment: 36_000,
          date: new Date(2026, 2, 5),
          projectId: null,
        },
      ],
    });
    const rebookedTransactionId = await expectRebookedDebtArtifacts(previousTransactionId);

    // Same payload: the same period × account key with an unchanged fingerprint
    // returns the stored result without re-booking anything.
    await confirmStage('DEBT_REPAYMENT', {
      repayments: [
        {
          debtAccountId: loanId,
          totalPayment: 36_000,
          date: new Date(2026, 2, 5),
          projectId: null,
        },
      ],
    });
    const samePayload = await withFreshReader(async (samePayloadReaderDb) => {
      const samePayloadTransactions = await getDocsFromServer(
        query(
          collection(samePayloadReaderDb, 'households', householdId, 'transactions'),
          where('intentType', '==', 'DEBT_PAYMENT'),
          where('date', '>=', new Date(2026, 2, 1)),
          where('date', '<', new Date(2026, 3, 1)),
        ),
      );
      const samePayloadSnapshot = await getDoc(
        doc(
          samePayloadReaderDb,
          'households',
          householdId,
          'debtAccounts',
          loanId,
          'snapshots',
          yearMonth,
        ),
      );
      return { samePayloadTransactions, samePayloadSnapshot };
    });
    expect(samePayload.samePayloadTransactions.docs).toHaveLength(1);
    expect(samePayload.samePayloadTransactions.docs[0]!.id).toBe(rebookedTransactionId);
    expect(samePayload.samePayloadSnapshot.data()?.totalPaid).toBe(36_000);

    // Zero amount: the cleared month deletes the repayment transaction and
    // covers the snapshot with zeros (the balance returns to its opening).
    await confirmStage('DEBT_REPAYMENT', {
      repayments: [
        {
          debtAccountId: loanId,
          totalPayment: 0,
          date: new Date(2026, 2, 5),
          projectId: null,
        },
      ],
    });
    const cleared = await withFreshReader(async (clearedReaderDb) => {
      const clearedTransactions = await getDocsFromServer(
        query(
          collection(clearedReaderDb, 'households', householdId, 'transactions'),
          where('intentType', '==', 'DEBT_PAYMENT'),
          where('date', '>=', new Date(2026, 2, 1)),
          where('date', '<', new Date(2026, 3, 1)),
        ),
      );
      const clearedSnapshot = await getDoc(
        doc(
          clearedReaderDb,
          'households',
          householdId,
          'debtAccounts',
          loanId,
          'snapshots',
          yearMonth,
        ),
      );
      const clearedAccount = await getDoc(
        doc(clearedReaderDb, 'households', householdId, 'debtAccounts', loanId),
      );
      return { clearedTransactions, clearedSnapshot, clearedAccount };
    });
    expect(cleared.clearedTransactions.docs).toHaveLength(0);
    expect(cleared.clearedSnapshot.data()?.totalPaid).toBe(0);
    expect(cleared.clearedSnapshot.data()?.principalPaid).toBe(0);
    expect(cleared.clearedSnapshot.data()?.interestPaid).toBe(0);
    expect(cleared.clearedAccount.data()?.currentBalance).toBe(1_200_000);

    // COMPLETENESS_CHECK pauses on the watched debt with zero activity. The
    // stage stays PENDING; re-confirming it is the resolution path (ADR-0052).
    await confirmStage('COMPLETENESS_CHECK', {});
    period = await financialPeriodRepository.getPeriod(householdId, yearMonth);
    expect(period?.status).toBe('NEEDS_REVIEW');
    expect(period?.reviewSourceStageId).toBe('COMPLETENESS_CHECK');
    expect(period?.stages.COMPLETENESS_CHECK.status).toBe('PENDING');

    // Close Period is refused while the review is unresolved: the walk position
    // is earlier in the pipeline (ADR-0070), so the guard rejects the jump.
    await expect(confirmStage('CLOSE_PERIOD', {})).rejects.toMatchObject({
      code: 'STAGE_NOT_WALK_POSITION',
    });

    // Resolving the review completes the stage without re-running the check.
    await confirmStage('COMPLETENESS_CHECK', {});
    period = await financialPeriodRepository.getPeriod(householdId, yearMonth);
    expect(period?.status).toBe('IN_PROGRESS');
    expect(period?.stages.COMPLETENESS_CHECK.status).toBe('COMPLETED');

    // CLOSE_PERIOD is refused before reports exist: the stage action throws
    // REPORTS_NOT_PERSISTED while the period is not paused.
    await expect(confirmStage('CLOSE_PERIOD', {})).rejects.toMatchObject({
      code: 'REPORTS_NOT_PERSISTED',
    });

    // FINANCIAL_REPORTS persists all three reports for the period.
    await expect(
      getReportPersistenceStateUseCase.execute({ householdId: householdId, yearMonth }),
    ).resolves.toMatchObject({ isPersisted: false });
    await confirmStage('FINANCIAL_REPORTS', {});
    await expect(
      getReportPersistenceStateUseCase.execute({ householdId: householdId, yearMonth }),
    ).resolves.toMatchObject({ isPersisted: true });
    for (const reportType of [
      ReportType.INCOME_STATEMENT,
      ReportType.BALANCE_SHEET,
      ReportType.CASH_FLOW,
    ]) {
      await expect(
        reportRepository.getReport(householdId, yearMonth, reportType),
      ).resolves.not.toBeNull();
    }

    // CLOSE_PERIOD closes the period.
    await confirmStage('CLOSE_PERIOD', {});
    period = await financialPeriodRepository.getPeriod(householdId, yearMonth);
    expect(period?.status).toBe('CLOSED');
    expect(
      CLOSE_STAGE_IDS.every((stageId) => period?.stages[stageId]?.status === 'COMPLETED'),
    ).toBe(true);

    await expectReopenRecloses();
  });

  it('reopens a closed period and demotes later closed periods (ADR-0066)', async () => {
    const seedClosedPeriod = async (closedYearMonth: string) => {
      await setDoc(doc(db, 'households', householdId, 'financialPeriods', closedYearMonth), {
        id: closedYearMonth,
        yearMonth: closedYearMonth,
        status: 'CLOSED',
        stages: Object.fromEntries(
          CLOSE_STAGE_IDS.map((stageId) => [
            stageId,
            { status: 'COMPLETED', confirmedBy: 'user@example.com' },
          ]),
        ),
        reviewSourceStageId: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: 'user@example.com',
        updatedBy: 'user@example.com',
      });
    };
    await seedClosedPeriod('2026-03');
    await seedClosedPeriod('2026-04');

    const reopened = await monthlyCloseWorkflowUseCase.reopen({
      householdId: householdId,
      yearMonth: '2026-03',
      userEmail: 'user@example.com',
      auth,
    });

    expect(reopened.status).toBe('IN_PROGRESS');
    expect(reopened.stages.FINANCIAL_REPORTS?.status).toBe('PENDING');
    expect(reopened.stages.CLOSE_PERIOD?.status).toBe('PENDING');
    const reopenedPersisted = await financialPeriodRepository.getPeriod(householdId, '2026-03');
    expect(reopenedPersisted?.status).toBe('IN_PROGRESS');

    const cascade = await financialPeriodRepository.getPeriod(householdId, '2026-04');
    expect(cascade?.status).toBe('NEEDS_REVIEW');
    expect(cascade?.reviewSourceStageId).toBeNull();
    expect(cascade?.stages.FINANCIAL_REPORTS?.status).toBe('COMPLETED');

    // Recovery: the demoted period reopens through the same path. A cascade
    // demotion means the close may rest on pre-correction history, so every
    // stage resets to PENDING and the period stays NEEDS_REVIEW (ADR-0070):
    // recovery is a forced sequential walk from the first stage.
    const recovered = await monthlyCloseWorkflowUseCase.reopen({
      householdId: householdId,
      yearMonth: '2026-04',
      userEmail: 'user@example.com',
      auth,
    });
    expect(recovered.status).toBe('NEEDS_REVIEW');
    expect(recovered.reviewSourceStageId).toBeNull();
    for (const stageId of CLOSE_STAGE_IDS) {
      expect(recovered.stages[stageId]?.status).toBe('PENDING');
    }
  });

  it('re-confirms portfolio cash flows with the booked flows instead of zero-filling', async () => {
    await monthlyCloseWorkflowUseCase.start({
      householdId: householdId,
      yearMonth,
      userEmail: 'user@example.com',
      auth,
    });

    await confirmStage('PORTFOLIO_CASH_FLOW', {
      portfolioCashFlows: { [portfolioId]: { deposits: amount, withdrawals: 0 } },
    });

    // Same-key overwrite with the booked flows: the snapshot is rewritten in
    // place, not duplicated, and keeps the submitted values (the write-path
    // half of the August re-close regression).
    await confirmStage('PORTFOLIO_CASH_FLOW', {
      portfolioCashFlows: { [portfolioId]: { deposits: amount, withdrawals: 5_000 } },
    });
    const rewritten = await getDoc(
      doc(db, 'households', householdId, 'portfolios', portfolioId, 'snapshots', yearMonth),
    );
    expect(rewritten.exists()).toBe(true);
    expect(rewritten.data()?.cashFlow).toEqual({ deposits: amount, withdrawals: 5_000 });

    // Re-confirm with a missing portfolio input: zero-fill is explicit contract
    // (ADR-0052) but the snapshot is still keyed by period, never duplicated.
    await confirmStage('PORTFOLIO_CASH_FLOW', {});
    const zeroFilled = await getDoc(
      doc(db, 'households', householdId, 'portfolios', portfolioId, 'snapshots', yearMonth),
    );
    expect(zeroFilled.data()?.cashFlow).toEqual({ deposits: 0, withdrawals: 0 });
    const snapshotCount = (
      await getDocsFromServer(
        collection(db, 'households', householdId, 'portfolios', portfolioId, 'snapshots'),
      )
    ).docs.length;
    expect(snapshotCount).toBe(1);
  });

  it('diff-merges securities and financing rows across re-confirms', async () => {
    await monthlyCloseWorkflowUseCase.start({
      householdId: householdId,
      yearMonth,
      userEmail: 'user@example.com',
      auth,
    });

    const buy = { amount: 50_000, date: new Date(2026, 2, 10), description: 'VTI buy' };
    const sell = { amount: 20_000, date: new Date(2026, 2, 20), description: 'VTI sell' };
    const borrow = { amount: 30_000, date: new Date(2026, 2, 12), description: 'shareholder loan' };
    const payout = { amount: 10_000, date: new Date(2026, 2, 25), description: 'dividend' };

    // First confirmation creates all four transaction kinds with
    // intent-specific ledger entries from the intent mapping.
    const firstConfirm = await confirmStage('SECURITIES_TRADE', {
      securities: { buys: [buy], sells: [sell] },
      financing: { shareholderFinancing: [borrow], dividendPayout: [payout] },
    });

    const byIntent = await findTransactionsByIntents([
      'SECURITY_BUY',
      'SECURITY_SELL',
      'SHAREHOLDER_FINANCING',
      'DIVIDEND_PAYOUT',
    ]);
    expect(Object.keys(byIntent).sort()).toEqual([
      'DIVIDEND_PAYOUT',
      'SECURITY_BUY',
      'SECURITY_SELL',
      'SHAREHOLDER_FINANCING',
    ]);
    const expectedAmounts: Record<string, number> = {
      SECURITY_BUY: buy.amount,
      SECURITY_SELL: sell.amount,
      SHAREHOLDER_FINANCING: borrow.amount,
      DIVIDEND_PAYOUT: payout.amount,
    };
    for (const [intent, transactions] of Object.entries(byIntent)) {
      expect(transactions).toHaveLength(1);
      const transaction = transactions[0];
      expect(transaction.intentType).toBe(
        intent === 'SECURITY_BUY' || intent === 'SECURITY_SELL' ? 'INVESTMENT' : 'FINANCING',
      );
      expect(transaction.amount).toBe(expectedAmounts[intent]);
      expect(transaction.entries).toHaveLength(2);
      expect(transaction.entries[0].debit).toBe(expectedAmounts[intent]);
    }

    // #250: the confirm response carries the authoritative rows — the same
    // documents just booked, with their IDs — so the stage can adopt them
    // without a reload and a re-confirm updates in place.
    expect(firstConfirm.data?.buys.map((row) => row.transactionId)).toEqual([
      byIntent.SECURITY_BUY[0].id,
    ]);
    expect(firstConfirm.data?.sells.map((row) => row.transactionId)).toEqual([
      byIntent.SECURITY_SELL[0].id,
    ]);
    expect(firstConfirm.data?.shareholderFinancing.map((row) => row.transactionId)).toEqual([
      byIntent.SHAREHOLDER_FINANCING[0].id,
    ]);
    expect(firstConfirm.data?.dividendPayout.map((row) => row.transactionId)).toEqual([
      byIntent.DIVIDEND_PAYOUT[0].id,
    ]);

    // Capture document IDs from the first booking, then re-confirm with the
    // buy edited, the sell flipped to a buy, the dividend removed, and new
    // financing: IDs are reused (update-in-place), the flip moves the row
    // across sides, and the removed ID is deleted.
    const firstBuyId = byIntent.SECURITY_BUY[0].id;
    const firstSellId = byIntent.SECURITY_SELL[0].id;
    const firstBorrowId = byIntent.SHAREHOLDER_FINANCING[0].id;
    const firstPayoutId = byIntent.DIVIDEND_PAYOUT[0].id;

    const secondConfirm = await confirmStage('SECURITIES_TRADE', {
      securities: {
        buys: [
          { transactionId: firstBuyId, amount: 60_000, date: buy.date, projectId: null },
          { transactionId: firstSellId, amount: 25_000, date: sell.date, projectId: null },
        ],
        sells: [],
      },
      financing: {
        shareholderFinancing: [
          {
            transactionId: firstBorrowId,
            amount: borrow.amount,
            date: borrow.date,
            projectId: null,
          },
        ],
        dividendPayout: [{ amount: 12_000, date: payout.date, projectId: null }],
      },
      removedTransactionIds: [firstPayoutId],
    });

    // Fresh reader instance: the long-lived shared instance serves stale
    // local snapshots after transaction deletes on this SDK version (same
    // workaround as the debt rebook assertions above).
    const reconfirmed = await withFreshReader((readerDb) =>
      readTransactionsFromReader(readerDb, [
        'SECURITY_BUY',
        'SECURITY_SELL',
        'SHAREHOLDER_FINANCING',
        'DIVIDEND_PAYOUT',
      ]),
    );
    // The edited buy and the sell flipped into a buy reuse their document
    // IDs (update-in-place); the removed dividend ID is gone and the new
    // payout row is a fresh document.
    expect(reconfirmed.SECURITY_BUY.map((transaction) => transaction.id).sort()).toEqual(
      [firstBuyId, firstSellId].sort(),
    );
    expect(
      reconfirmed.SECURITY_BUY.map((transaction) => transaction.amount).sort((a, b) => a - b),
    ).toEqual([25_000, 60_000]);
    expect(reconfirmed.SECURITY_SELL).toHaveLength(0);
    expect(reconfirmed.SHAREHOLDER_FINANCING).toHaveLength(1);
    expect(reconfirmed.SHAREHOLDER_FINANCING[0].id).toBe(firstBorrowId);
    expect(reconfirmed.DIVIDEND_PAYOUT).toHaveLength(1);
    expect(reconfirmed.DIVIDEND_PAYOUT[0].id).not.toBe(firstPayoutId);
    expect(reconfirmed.DIVIDEND_PAYOUT[0].amount).toBe(12_000);

    // The re-confirm response matches what was persisted: reused IDs for the
    // updated rows, the fresh ID for the new payout row.
    expect(secondConfirm.data?.buys.map((row) => row.transactionId)).toEqual([
      firstBuyId,
      firstSellId,
    ]);
    expect(secondConfirm.data?.sells).toEqual([]);
    expect(secondConfirm.data?.dividendPayout.map((row) => row.transactionId)).toEqual([
      reconfirmed.DIVIDEND_PAYOUT[0].id,
    ]);
  });

  it('books a grace-period repayment: above-interest excess books as principal', async () => {
    await monthlyCloseWorkflowUseCase.start({
      householdId: householdId,
      yearMonth,
      userEmail: 'user@example.com',
      auth,
    });

    const graceLoanId = await createDebtAccountUseCase.execute({
      householdId: householdId,
      data: {
        name: 'Loan in grace',
        type: 'mortgage',
        repaymentType: 'equal_payment',
        originalAmount: 9_500_000,
        currentBalance: 9_490_000,
        interestRate: 1.77,
        startDate: new Date(2025, 10, 24),
        endDate: new Date(2030, 10, 24),
        graceEndDate: new Date(2030, 10, 24),
        monthlyPayment: 50_000,
        linkedProjectId: null,
        isActive: true,
      },
      userEmail: 'user@example.com',
      auth,
    });

    await confirmStage('ACCOUNT_BALANCE', {
      accountBalances: [
        { accountId: 'acc-1', amount },
        { accountId: 'acc-securities', amount },
      ],
    });
    await confirmStage('TRANSACTION_VALIDATION', {});
    await confirmStage('SECURITIES_TRADE', {});
    await confirmStage('PORTFOLIO_CASH_FLOW', {});
    await confirmStage('PROJECT_SETTLEMENT', {});

    // The unified split (issue #95 family): a grace-period payment above the
    // month's interest books the excess as principal (early repayment). The
    // opening balance derives from originalAmount, so the month interest is
    // 9,500,000 × 1.77% / 12 = 14,012.5 and the 14,014 payment splits
    // 1.5 principal / 14,012.5 interest.
    await confirmStage('DEBT_REPAYMENT', {
      repayments: [
        {
          debtAccountId: graceLoanId,
          totalPayment: 14_014,
          date: new Date(2026, 2, 5),
          projectId: null,
        },
      ],
    });

    const repaymentTransaction = await findTransactionByIntentOrIntentType('DEBT_PAYMENT');
    expect(repaymentTransaction).not.toBeNull();
    expect(repaymentTransaction?.debtAccountId).toBe(graceLoanId);
    expect(repaymentTransaction?.amount).toBe(14_014);

    const graceSnapshot = await getDoc(
      doc(db, 'households', householdId, 'debtAccounts', graceLoanId, 'snapshots', yearMonth),
    );
    expect(graceSnapshot.exists()).toBe(true);
    expect(graceSnapshot.data()?.totalPaid).toBe(14_014);
    expect(graceSnapshot.data()?.principalPaid).toBe(1.5);
    expect(graceSnapshot.data()?.interestPaid).toBe(14_012.5);

    const graceAccount = await getDoc(
      doc(db, 'households', householdId, 'debtAccounts', graceLoanId),
    );
    expect(graceAccount.data()?.currentBalance).toBe(9_500_000 - 1.5);
  });

  it('validates real month transactions without modifying them', async () => {
    await monthlyCloseWorkflowUseCase.start({
      householdId: householdId,
      yearMonth,
      userEmail: 'user@example.com',
      auth,
    });

    await confirmStage('SECURITIES_TRADE', {
      securities: { buys: [{ amount, date: new Date(2026, 2, 10) }], sells: [] },
    });
    const before = await findTransactionByIntentOrIntentType('SECURITY_BUY');

    // Transaction Validation batch-checks a month that actually holds
    // transactions and completes without rewriting any of them (spec 05).
    await confirmStage('TRANSACTION_VALIDATION', {});

    const after = await findTransactionByIntentOrIntentType('SECURITY_BUY');
    expect(after).not.toBeNull();
    expect(after?.id).toBe(before?.id);
    expect(after?.amount).toBe(before?.amount);
    expect(after?.date).toEqual(before?.date);
    expect(after?.updatedAt).toEqual(before?.updatedAt);
  });
});

const findTransactionByIntentOrIntentType = async (code: string) => {
  const snapshot = await getDocsFromServer(
    collection(db, 'households', householdId, 'transactions'),
  );
  return snapshot.docs
    .map((docSnapshot) => docSnapshot.data())
    .find((data) => data.intentType === code || data.intent === code);
};

const findTransactionsByIntents = async (intents: string[]) => {
  const snapshot = await getDocsFromServer(
    collection(db, 'households', householdId, 'transactions'),
  );
  return collectTransactionsByIntent(snapshot.docs, intents);
};

const readTransactionsFromReader = async (readerDb: Firestore, intents: string[]) => {
  const snapshot = await getDocsFromServer(
    collection(readerDb, 'households', householdId, 'transactions'),
  );
  return collectTransactionsByIntent(snapshot.docs, intents);
};

const collectTransactionsByIntent = (
  docs: { id: string; data: () => Record<string, unknown> }[],
  intents: string[],
) => {
  const byIntent: Record<
    string,
    {
      id: string;
      intent: string;
      intentType: string;
      amount: number;
      entries: { ledgerCode: string; debit: number; credit: number }[];
    }[]
  > = {};
  for (const intent of intents) byIntent[intent] = [];
  for (const docSnapshot of docs) {
    const data = docSnapshot.data();
    if (intents.includes(data.intent as string)) {
      byIntent[data.intent as string].push({
        id: docSnapshot.id,
        intent: data.intent as string,
        intentType: data.intentType as string,
        amount: data.amount as number,
        entries: data.entries as { ledgerCode: string; debit: number; credit: number }[],
      });
    }
  }
  return byIntent;
};
