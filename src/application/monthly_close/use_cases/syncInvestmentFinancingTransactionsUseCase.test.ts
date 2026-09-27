import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTransactionUseCase } from '@/application/ledger/use_cases/createTransactionUseCase';
import { deleteTransactionUseCase } from '@/application/ledger/use_cases/deleteTransactionUseCase';
import { updateTransactionUseCase } from '@/application/ledger/use_cases/updateTransactionUseCase';
import { syncInvestmentFinancingTransactionsUseCase } from '@/application/monthly_close/use_cases/syncInvestmentFinancingTransactionsUseCase';
import { type AuthContext } from '@/application/types';

vi.mock('@/application/ledger/use_cases/createTransactionUseCase');
vi.mock('@/application/ledger/use_cases/deleteTransactionUseCase');
vi.mock('@/application/ledger/use_cases/updateTransactionUseCase');

const auth: AuthContext = { uid: 'user-1', email: 'user@test.com' };

const baseRequest = {
  householdId: 'household-1',
  userEmail: 'user@test.com',
  auth,
};

describe('SyncInvestmentFinancingTransactionsUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates transactions for new rows with intent-mapped entries', async () => {
    await syncInvestmentFinancingTransactionsUseCase.execute({
      ...baseRequest,
      securities: {
        buys: [{ amount: 5000, date: new Date('2026-09-02'), description: 'buy 0050' }],
        sells: [],
      },
      financing: {
        shareholderFinancing: [
          { amount: 10_000, date: new Date('2026-09-03'), projectId: 'proj-1' },
        ],
        dividendPayout: [],
      },
    });

    expect(createTransactionUseCase.execute).toHaveBeenCalledTimes(2);
    expect(createTransactionUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      userEmail: 'user@test.com',
      data: expect.objectContaining({
        intent: 'SECURITY_BUY',
        intentType: 'INVESTMENT',
        amount: 5000,
        entries: [
          { ledgerCode: 'asset:investment', debit: 5000, credit: 0 },
          { ledgerCode: 'asset:cash', debit: 0, credit: 5000 },
        ],
      }),
    });
    expect(createTransactionUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      userEmail: 'user@test.com',
      data: expect.objectContaining({
        intent: 'SHAREHOLDER_FINANCING',
        intentType: 'FINANCING',
        projectId: 'proj-1',
      }),
    });
    expect(updateTransactionUseCase.execute).not.toHaveBeenCalled();
    expect(deleteTransactionUseCase.execute).not.toHaveBeenCalled();
  });

  it('updates loaded rows in place and deletes removed IDs', async () => {
    await syncInvestmentFinancingTransactionsUseCase.execute({
      ...baseRequest,
      securities: {
        buys: [{ transactionId: 'tx-1', amount: 7000, date: new Date('2026-09-02') }],
        sells: [],
      },
      financing: {
        shareholderFinancing: [],
        dividendPayout: [],
      },
      removedTransactionIds: ['tx-2', 'tx-3'],
    });

    expect(updateTransactionUseCase.execute).toHaveBeenCalledTimes(1);
    expect(updateTransactionUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: 'tx-1',
        data: expect.objectContaining({ amount: 7000, intent: 'SECURITY_BUY' }),
        allocation: null,
      }),
    );
    expect(createTransactionUseCase.execute).not.toHaveBeenCalled();
    expect(deleteTransactionUseCase.execute).toHaveBeenCalledTimes(2);
    expect(deleteTransactionUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      transactionId: 'tx-2',
      auth,
    });
  });

  it('moves a loaded row across sides by updating its intent', async () => {
    await syncInvestmentFinancingTransactionsUseCase.execute({
      ...baseRequest,
      securities: {
        buys: [],
        sells: [{ transactionId: 'tx-1', amount: 4000, date: new Date('2026-09-02') }],
      },
      financing: {
        shareholderFinancing: [],
        dividendPayout: [],
      },
    });

    expect(updateTransactionUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: 'tx-1',
        data: expect.objectContaining({ intent: 'SECURITY_SELL' }),
      }),
    );
  });
});
