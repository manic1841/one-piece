import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getMonthInvestmentFinancingUseCase } from '@/application/monthly_close/use_cases/getMonthInvestmentFinancingUseCase';
import { type Transaction } from '@/domains/ledger/schemas';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

vi.mock('@/infra/repositories/transactionRepository', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/infra/repositories/transactionRepository')>();
  return { ...actual, transactionRepository: { listByDateRange: vi.fn() } };
});

const tx = (overrides: Partial<Transaction>): Transaction => ({
  id: 'tx-1',
  householdId: 'household-1',
  createdBy: 'user-1',
  entries: [],
  date: new Date('2026-09-02'),
  ...overrides,
});

describe('GetMonthInvestmentFinancingUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns month transactions bucketed by intent', async () => {
    vi.mocked(transactionRepository.listByDateRange).mockResolvedValue([
      tx({ intent: 'SECURITY_BUY', intentType: 'INVESTMENT', amount: 5000 }),
      tx({ id: 'tx-2', intent: 'SECURITY_SELL', intentType: 'INVESTMENT', amount: 2000 }),
      tx({ id: 'tx-3', intent: 'SHAREHOLDER_FINANCING', intentType: 'FINANCING', amount: 10_000 }),
      tx({ id: 'tx-4', intent: 'DIVIDEND_PAYOUT', intentType: 'FINANCING', amount: 3000 }),
      tx({ id: 'tx-5', intent: 'DEBT_PAYMENT', intentType: 'DEBT', amount: 1000 }),
    ]);

    const result = await getMonthInvestmentFinancingUseCase.execute({
      householdId: 'household-1',
      year: 2026,
      month: 9,
    });

    expect(result.buys).toHaveLength(1);
    expect(result.sells).toHaveLength(1);
    expect(result.shareholderFinancing).toHaveLength(1);
    expect(result.dividendPayout).toHaveLength(1);
    expect(transactionRepository.listByDateRange).toHaveBeenCalledWith(
      'household-1',
      new Date(2026, 8, 1),
      new Date(2026, 9, 1),
    );
  });
});
