import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { beforeEach, describe, expect, it } from 'vitest';

import { getSettlementReadinessUseCase } from '@/application/report/use_cases/getSettlementReadinessUseCase';
import { db, resetMockDb } from '@/test/mocks/firebase';

const auth = { uid: 'user-1', email: 'user@example.com', isGlobalAdmin: true };

const seedAccount = async (
  householdId: string,
  accountId: string,
  isActive: boolean,
) => {
  await setDoc(doc(db, 'households', householdId, 'accounts', accountId), {
    id: accountId,
    name: `Account ${accountId}`,
    category: 'cash',
    currency: 'TWD',
    order: 0,
    isActive,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: 'user@example.com',
    updatedBy: 'user@example.com',
  });
};

const seedAccountSnapshot = async (
  householdId: string,
  accountId: string,
  yearMonth: string,
) => {
  await setDoc(
    doc(db, 'households', householdId, 'accounts', accountId, 'snapshots', yearMonth),
    {
      id: yearMonth,
      accountId,
      year: Number(yearMonth.split('-')[0]),
      month: Number(yearMonth.split('-')[1]),
      amount: 1000,
      holdings: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: 'user@example.com',
      updatedBy: 'user@example.com',
    },
  );
};

const seedPortfolio = async (
  householdId: string,
  portfolioId: string,
  isActive: boolean,
) => {
  await setDoc(doc(db, 'households', householdId, 'portfolios', portfolioId), {
    id: portfolioId,
    name: `Portfolio ${portfolioId}`,
    securitiesAccountId: 'acc-1',
    bankAccountId: 'acc-2',
    isActive,
    order: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: 'user@example.com',
    updatedBy: 'user@example.com',
  });
};

const seedPortfolioSnapshot = async (
  householdId: string,
  portfolioId: string,
  yearMonth: string,
) => {
  await setDoc(
    doc(db, 'households', householdId, 'portfolios', portfolioId, 'snapshots', yearMonth),
    {
      id: yearMonth,
      year: Number(yearMonth.split('-')[0]),
      month: Number(yearMonth.split('-')[1]),
      totalValue: 1000,
      accounts: [],
      performance: {
        openingValue: 0,
        closingValue: 1000,
        netCashFlow: 0,
        gain: 0,
        returnRate: 0,
        cumulativeGain: 0,
        cumulativeReturnRate: 0,
      },
      cashFlow: { deposits: 0, withdrawals: 0 },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: 'user@example.com',
      updatedBy: 'user@example.com',
    },
  );
};

const seedProject = async (
  householdId: string,
  projectId: string,
  isActive: boolean,
) => {
  await setDoc(doc(db, 'households', householdId, 'projects', projectId), {
    id: projectId,
    name: `Project ${projectId}`,
    description: '',
    color: '#000000',
    icon: 'default',
    category: 'OPERATING',
    isActive,
    order: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: 'user@example.com',
    updatedBy: 'user@example.com',
  });
};

const seedProjectSnapshot = async (
  householdId: string,
  projectId: string,
  yearMonth: string,
) => {
  await setDoc(
    doc(db, 'households', householdId, 'projects', projectId, 'snapshots', yearMonth),
    {
      id: yearMonth,
      year: Number(yearMonth.split('-')[0]),
      month: Number(yearMonth.split('-')[1]),
      openingBalance: 0,
      income: 0,
      expense: 0,
      closingBalance: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: 'user@example.com',
      updatedBy: 'user@example.com',
    },
  );
};

const seedDebtAccount = async (
  householdId: string,
  debtAccountId: string,
  isActive: boolean,
) => {
  await setDoc(doc(db, 'households', householdId, 'debtAccounts', debtAccountId), {
    id: debtAccountId,
    name: `Debt ${debtAccountId}`,
    type: 'mortgage',
    repaymentType: 'equal_payment',
    originalAmount: 1000000,
    currentBalance: 900000,
    interestRate: 2.1,
    startDate: serverTimestamp(),
    endDate: serverTimestamp(),
    graceEndDate: null,
    monthlyPayment: 35000,
    linkedLedgerCode: 'liability:mortgage',
    linkedProjectId: null,
    isActive,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: 'user@example.com',
    updatedBy: 'user@example.com',
  });
};

const seedDebtSnapshot = async (
  householdId: string,
  debtAccountId: string,
  yearMonth: string,
) => {
  await setDoc(
    doc(db, 'households', householdId, 'debtAccounts', debtAccountId, 'snapshots', yearMonth),
    {
      id: yearMonth,
      yearMonth,
      openingBalance: 1000000,
      principalPaid: 30000,
      interestPaid: 5000,
      totalPaid: 35000,
      closingBalance: 970000,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: 'user@example.com',
      updatedBy: 'user@example.com',
    },
  );
};

describe('getSettlementReadinessUseCase — emulator integration', () => {
  let householdId: string;
  const year = 2026;
  const month = 3;
  const yearMonth = '2026-03';

  beforeEach(async () => {
    await resetMockDb();
    householdId = `household-readiness-${crypto.randomUUID()}`;
  });

  it('returns isReady=true when all active entities have snapshots', async () => {
    await seedAccount(householdId, 'acc-1', true);
    await seedAccountSnapshot(householdId, 'acc-1', yearMonth);
    await seedPortfolio(householdId, 'port-1', true);
    await seedPortfolioSnapshot(householdId, 'port-1', yearMonth);
    await seedProject(householdId, 'proj-1', true);
    await seedProjectSnapshot(householdId, 'proj-1', yearMonth);
    await seedDebtAccount(householdId, 'debt-1', true);
    await seedDebtSnapshot(householdId, 'debt-1', yearMonth);

    const result = await getSettlementReadinessUseCase.execute({
      householdId,
      auth,
      year,
      month,
    });

    expect(result.isReady).toBe(true);
    expect(result.totalUnsettled).toBe(0);
    expect(result.unsettledAccounts).toEqual([]);
    expect(result.unsettledPortfolios).toEqual([]);
    expect(result.unsettledDebts).toEqual([]);
    expect(result.unsettledProjects).toEqual([]);
  });

  it('returns isReady=false when an active account is missing its snapshot', async () => {
    await seedAccount(householdId, 'acc-1', true);
    await seedAccount(householdId, 'acc-2', true);
    await seedAccountSnapshot(householdId, 'acc-1', yearMonth);
    // acc-2 has no snapshot

    await seedPortfolio(householdId, 'port-1', true);
    await seedPortfolioSnapshot(householdId, 'port-1', yearMonth);
    await seedProject(householdId, 'proj-1', true);
    await seedProjectSnapshot(householdId, 'proj-1', yearMonth);
    await seedDebtAccount(householdId, 'debt-1', true);
    await seedDebtSnapshot(householdId, 'debt-1', yearMonth);

    const result = await getSettlementReadinessUseCase.execute({
      householdId,
      auth,
      year,
      month,
    });

    expect(result.isReady).toBe(false);
    expect(result.unsettledAccounts.map((a) => a.id)).toEqual(['acc-2']);
    expect(result.totalUnsettled).toBe(1);
  });

  it('returns isReady=false when an active portfolio is missing its snapshot', async () => {
    await seedAccount(householdId, 'acc-1', true);
    await seedAccountSnapshot(householdId, 'acc-1', yearMonth);
    await seedPortfolio(householdId, 'port-1', true);
    // port-1 has no snapshot

    await seedProject(householdId, 'proj-1', true);
    await seedProjectSnapshot(householdId, 'proj-1', yearMonth);
    await seedDebtAccount(householdId, 'debt-1', true);
    await seedDebtSnapshot(householdId, 'debt-1', yearMonth);

    const result = await getSettlementReadinessUseCase.execute({
      householdId,
      auth,
      year,
      month,
    });

    expect(result.isReady).toBe(false);
    expect(result.unsettledPortfolios.map((p) => p.id)).toEqual(['port-1']);
  });

  it('returns isReady=false when an active debt is missing its snapshot', async () => {
    await seedAccount(householdId, 'acc-1', true);
    await seedAccountSnapshot(householdId, 'acc-1', yearMonth);
    await seedPortfolio(householdId, 'port-1', true);
    await seedPortfolioSnapshot(householdId, 'port-1', yearMonth);
    await seedProject(householdId, 'proj-1', true);
    await seedProjectSnapshot(householdId, 'proj-1', yearMonth);
    await seedDebtAccount(householdId, 'debt-1', true);
    // debt-1 has no snapshot

    const result = await getSettlementReadinessUseCase.execute({
      householdId,
      auth,
      year,
      month,
    });

    expect(result.isReady).toBe(false);
    expect(result.unsettledDebts.map((d) => d.id)).toEqual(['debt-1']);
  });

  it('returns isReady=false when an active project is missing its snapshot', async () => {
    await seedAccount(householdId, 'acc-1', true);
    await seedAccountSnapshot(householdId, 'acc-1', yearMonth);
    await seedPortfolio(householdId, 'port-1', true);
    await seedPortfolioSnapshot(householdId, 'port-1', yearMonth);
    await seedProject(householdId, 'proj-1', true);
    // proj-1 has no snapshot

    await seedDebtAccount(householdId, 'debt-1', true);
    await seedDebtSnapshot(householdId, 'debt-1', yearMonth);

    const result = await getSettlementReadinessUseCase.execute({
      householdId,
      auth,
      year,
      month,
    });

    expect(result.isReady).toBe(false);
    expect(result.unsettledProjects.map((p) => p.id)).toEqual(['proj-1']);
  });

  it('ignores inactive entities — they do not affect readiness', async () => {
    await seedAccount(householdId, 'acc-active', true);
    await seedAccountSnapshot(householdId, 'acc-active', yearMonth);
    await seedAccount(householdId, 'acc-inactive', false);
    // acc-inactive has no snapshot but is inactive

    await seedPortfolio(householdId, 'port-inactive', false);
    // port-inactive has no snapshot but is inactive

    await seedProject(householdId, 'proj-inactive', false);
    // proj-inactive has no snapshot but is inactive

    await seedDebtAccount(householdId, 'debt-inactive', false);
    // debt-inactive has no snapshot but is inactive

    const result = await getSettlementReadinessUseCase.execute({
      householdId,
      auth,
      year,
      month,
    });

    expect(result.isReady).toBe(true);
    expect(result.totalUnsettled).toBe(0);
  });
});
