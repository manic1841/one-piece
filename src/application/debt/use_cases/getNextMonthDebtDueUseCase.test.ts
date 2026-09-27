import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./listDebtAccountsUseCase', () => ({
  listDebtAccountsUseCase: {
    execute: vi.fn(),
  },
}));

describe('getNextMonthDebtDueUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sums each active debt account monthly payment for next month', async () => {
    const { getNextMonthDebtDueUseCase } = await import('./getNextMonthDebtDueUseCase');
    const { listDebtAccountsUseCase } = await import('./listDebtAccountsUseCase');

    vi.mocked(listDebtAccountsUseCase.execute).mockResolvedValue([
      {
        id: 'debt-1',
        currentBalance: 1000,
        monthlyPayment: 120,
        interestRate: 12,
        startDate: new Date('2025-01-01'),
        graceEndDate: null,
      },
      {
        id: 'debt-2',
        currentBalance: 2000,
        monthlyPayment: 200,
        interestRate: 8,
        startDate: new Date('2025-01-01'),
        graceEndDate: null,
      },
    ] as never);

    const result = await getNextMonthDebtDueUseCase.execute({
      householdId: 'household-1',
      referenceDate: new Date('2026-09-17'),
    });

    expect(result.total).toBe(320);
    expect(result.yearMonth).toBe('2026-10');
    expect(listDebtAccountsUseCase.execute).toHaveBeenCalledWith({ householdId: 'household-1' });
  });

  it('uses grace-period interest for accounts in grace next month', async () => {
    const { getNextMonthDebtDueUseCase } = await import('./getNextMonthDebtDueUseCase');
    const { listDebtAccountsUseCase } = await import('./listDebtAccountsUseCase');

    vi.mocked(listDebtAccountsUseCase.execute).mockResolvedValue([
      {
        id: 'debt-grace',
        currentBalance: 12000,
        monthlyPayment: 500,
        interestRate: 12,
        startDate: new Date('2026-09-01'),
        graceEndDate: new Date('2026-12-01'),
      },
      {
        id: 'debt-normal',
        currentBalance: 3000,
        monthlyPayment: 300,
        interestRate: 6,
        startDate: new Date('2025-01-01'),
        graceEndDate: null,
      },
    ] as never);

    const result = await getNextMonthDebtDueUseCase.execute({
      householdId: 'household-1',
      referenceDate: new Date('2026-09-17'),
    });

    expect(result.total).toBe(420);
  });

  it('returns zero when there are no debt accounts', async () => {
    const { getNextMonthDebtDueUseCase } = await import('./getNextMonthDebtDueUseCase');
    const { listDebtAccountsUseCase } = await import('./listDebtAccountsUseCase');

    vi.mocked(listDebtAccountsUseCase.execute).mockResolvedValue([]);

    const result = await getNextMonthDebtDueUseCase.execute({
      householdId: 'household-1',
      referenceDate: new Date('2026-09-17'),
    });

    expect(result.total).toBe(0);
    expect(result.yearMonth).toBe('2026-10');
  });

  it('rolls across the year boundary to January', async () => {
    const { getNextMonthDebtDueUseCase } = await import('./getNextMonthDebtDueUseCase');
    const { listDebtAccountsUseCase } = await import('./listDebtAccountsUseCase');

    vi.mocked(listDebtAccountsUseCase.execute).mockResolvedValue([]);

    const result = await getNextMonthDebtDueUseCase.execute({
      householdId: 'household-1',
      referenceDate: new Date('2026-12-15'),
    });

    expect(result.yearMonth).toBe('2027-01');
  });
});
