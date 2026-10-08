import { beforeEach, describe, expect, it } from 'vitest';

import { getSettlementReadinessUseCase } from '@/application/report/use_cases/getSettlementReadinessUseCase';
import { TEST_USER as auth } from '@/test/factories';
import { resetMockDb } from '@/test/mocks/firebase';
import * as seeds from '@/test/seeds';

// This file always seeds "an entity plus its snapshot for the active period",
// so the boolean shorthand is clearer here than repeating `{ isActive }`.
const seedAccount = (householdId: string, accountId: string, isActive: boolean) =>
  seeds.seedAccount(householdId, accountId, { isActive });

const seedAccountSnapshot = (householdId: string, accountId: string, yearMonth: string) =>
  seeds.seedAccountSnapshot(householdId, accountId, yearMonth);

const seedPortfolio = (householdId: string, portfolioId: string, isActive: boolean) =>
  seeds.seedPortfolio(householdId, portfolioId, { isActive });

const seedPortfolioSnapshot = (householdId: string, portfolioId: string, yearMonth: string) =>
  seeds.seedPortfolioSnapshot(householdId, portfolioId, yearMonth);

const seedProject = (householdId: string, projectId: string, isActive: boolean) =>
  seeds.seedProject(householdId, projectId, { isActive });

const seedProjectSnapshot = (householdId: string, projectId: string, yearMonth: string) =>
  seeds.seedProjectSnapshot(householdId, projectId, yearMonth);

const seedDebtAccount = (householdId: string, debtAccountId: string, isActive: boolean) =>
  seeds.seedDebtAccount(householdId, debtAccountId, { isActive });

const seedDebtSnapshot = (householdId: string, debtAccountId: string, yearMonth: string) =>
  seeds.seedDebtSnapshot(householdId, debtAccountId, yearMonth);

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
