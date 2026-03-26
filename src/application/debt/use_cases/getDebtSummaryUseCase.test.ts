import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./listDebtAccountsUseCase', () => ({
  listDebtAccountsUseCase: {
    execute: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/transactionRepository', () => ({
  transactionRepository: {
    listDebtPaymentsByDateRange: vi.fn(),
  },
}));

describe('getDebtSummaryUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aggregates debt totals, monthly due, and unpaid count', async () => {
    const { getDebtSummaryUseCase } = await import('./getDebtSummaryUseCase');
    const { listDebtAccountsUseCase } = await import('./listDebtAccountsUseCase');
    const { transactionRepository } = await import(
      '../../../infra/repositories/transactionRepository'
    );

    vi.mocked(listDebtAccountsUseCase.execute).mockResolvedValue([
      {
        id: 'debt-1',
        currentBalance: 1000,
        monthlyPayment: 120,
        interestRate: 12,
        graceEndDate: null,
      },
      {
        id: 'debt-2',
        currentBalance: 2000,
        monthlyPayment: 200,
        interestRate: 8,
        graceEndDate: null,
      },
    ] as never);

    vi.mocked(transactionRepository.listDebtPaymentsByDateRange).mockResolvedValue([
      { debtAccountId: 'debt-1' },
    ] as never);

    const result = await getDebtSummaryUseCase.execute({
      householdId: 'household-1',
      referenceDate: new Date('2026-03-15'),
    });

    expect(result.totalDebt).toBe(3000);
    expect(result.monthlyPaymentTotal).toBe(320);
    expect(result.unpaidCount).toBe(1);
    expect(transactionRepository.listDebtPaymentsByDateRange).toHaveBeenCalledTimes(1);
  });
});
