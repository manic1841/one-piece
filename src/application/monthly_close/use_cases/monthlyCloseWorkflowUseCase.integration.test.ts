import { collection, doc, getDoc, getDocsFromServer, serverTimestamp, setDoc } from 'firebase/firestore';

import { createDebtAccountUseCase } from '@/application/debt/use_cases/createDebtAccountUseCase';
import { createPortfolioUseCase } from '@/application/portfolio/use_cases/createPortfolioUseCase';
import { listPortfoliosUseCase } from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import { createProjectUseCase } from '@/application/project/use_cases/createProjectUseCase';
import {
  monthlyCloseWorkflowUseCase,
  type MonthlyCloseConfirmRequest,
  type MonthlyCloseStartRequest,
} from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { addWatchListTargetUseCase } from '@/application/watch_list/use_cases/addWatchListTargetUseCase';
import { getReportPersistenceStateUseCase } from '@/application/report/use_cases/getReportPersistenceStateUseCase';
import type { CloseStageId } from '@/domains/financial_period/schemas';
import { CLOSE_STAGE_IDS } from '@/domains/financial_period/schemas';
import { ReportType } from '@/domains/report/schemas';
import { financialPeriodRepository } from '@/infra/repositories/financialPeriodRepository';
import { projectRepository } from '@/infra/repositories/projectRepository';
import { reportRepository } from '@/infra/repositories/reportRepository';
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
      target: { targetType: 'DEBT_ACCOUNT', targetId: zeroPaymentLoanId, name: 'Loan with no payment' },
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
    expect(Object.values(period?.stages ?? {}).every((stage) => stage.status === 'PENDING')).toBe(true);

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

    // SECURITIES_TRADE creates a SECURITY_BUY (INVESTMENT intentType) transaction.
    const buyDate = new Date(2026, 2, 10);
    await confirmStage('SECURITIES_TRADE', {
      securities: { buys: [{ amount, date: buyDate, description: 'VTI buy' }], sells: [] },
    });
    const buyTransaction = await findTransactionByIntent('SECURITY_BUY');
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
    const repaymentTransaction = await findTransactionByIntent('DEBT_PAYMENT');
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

    // COMPLETENESS_CHECK pauses on the watched debt with zero activity. The
    // stage stays PENDING; re-confirming it is the resolution path (ADR-0052).
    await confirmStage('COMPLETENESS_CHECK', {});
    period = await financialPeriodRepository.getPeriod(householdId, yearMonth);
    expect(period?.status).toBe('NEEDS_REVIEW');
    expect(period?.reviewSourceStageId).toBe('COMPLETENESS_CHECK');
    expect(period?.stages.COMPLETENESS_CHECK.status).toBe('PENDING');

    // Close Period is refused while the review is unresolved.
    await expect(confirmStage('CLOSE_PERIOD', {})).rejects.toMatchObject({
      code: 'NEEDS_REVIEW_BLOCKED',
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
  });
});

const findTransactionByIntent = async (intentOrIntentTypeCode: string) => {
  const snapshot = await getDocsFromServer(
    collection(db, 'households', householdId, 'transactions'),
  );
  return snapshot.docs
    .map((docSnapshot) => docSnapshot.data())
    .find(
      (data) => data.intentType === intentOrIntentTypeCode || data.intent === intentOrIntentTypeCode,
    );
};
