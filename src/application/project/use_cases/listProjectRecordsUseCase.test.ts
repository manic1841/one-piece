import { beforeEach, describe, expect, it, vi } from 'vitest';

import { allocationRepository } from '../../../infra/repositories/allocationRepository';
import { transactionRepository } from '../../../infra/repositories/transactionRepository';

import { listProjectRecordsUseCase } from './listProjectRecordsUseCase';

vi.mock('@/infra/repositories/transactionRepository', () => ({
  transactionRepository: {
    getTransactionsByProject: vi.fn(),
    listByProject: vi.fn(),
    getById: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/allocationRepository', () => ({
  allocationRepository: {
    listByProject: vi.fn(),
  },
}));

describe('listProjectRecordsUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes allocation-derived records in project detail list', async () => {
    const directRecord = {
      id: 'tx-direct',
      date: new Date('2026-03-20T00:00:00.000Z'),
      description: 'Direct expense',
      intentType: 'EXPENSE',
      amount: -80,
      projectId: 'project-1',
      createdBy: 'u1',
      entries: [],
      ledgerCodes: [],
      createdAt: new Date('2026-03-20T00:00:00.000Z'),
      updatedAt: new Date('2026-03-20T00:00:00.000Z'),
      updatedBy: 'u1',
    };

    const sourceTransaction = {
      id: 'tx-alloc-source',
      date: new Date('2026-03-18T00:00:00.000Z'),
      description: 'Salary',
      intentType: 'INCOME',
      amount: 1000,
      projectId: null,
      createdBy: 'u1',
      entries: [],
      ledgerCodes: [],
      createdAt: new Date('2026-03-18T00:00:00.000Z'),
      updatedAt: new Date('2026-03-18T00:00:00.000Z'),
      updatedBy: 'u1',
    };

    vi.mocked(transactionRepository.listByProject).mockResolvedValue([directRecord] as never);
    vi.mocked(transactionRepository.getById).mockImplementation(async (_householdId, transactionId) => {
      if (transactionId === 'tx-alloc-source') {
        return sourceTransaction as never;
      }
      return null;
    });

    vi.mocked(allocationRepository.listByProject).mockResolvedValue([
      {
        id: 'alloc-1',
        sourceTransactionId: 'tx-alloc-source',
        direction: 'INCOME',
        totalAmount: 1000,
        items: [{ projectId: 'project-1', percentage: 40, amount: 400 }],
        projectIds: ['project-1'],
        createdBy: 'u1',
        date: new Date('2026-03-18T00:00:00.000Z'),
        yearMonth: '2026-03',
        createdAt: new Date('2026-03-18T00:00:00.000Z'),
        updatedAt: new Date('2026-03-18T00:00:00.000Z'),
        updatedBy: 'u1',
      },
    ] as never);

    const records = await listProjectRecordsUseCase.execute({
      householdId: 'household-1',
      projectId: 'project-1',
    });

    expect(records).toHaveLength(2);
    expect(records[0].id).toBe('tx-direct');
    expect(records[1].id).toBe('tx-alloc-source:allocation:project-1');
    expect(records[1].projectId).toBe('project-1');
    expect(records[1].amount).toBe(400);
  });

  it('uses negative amount for expense allocation records', async () => {
    const sourceTransaction = {
      id: 'tx-expense-source',
      date: new Date('2026-03-12T00:00:00.000Z'),
      description: 'Shared expense',
      intentType: 'EXPENSE',
      amount: 900,
      projectId: null,
      createdBy: 'u1',
      entries: [],
      ledgerCodes: [],
      createdAt: new Date('2026-03-12T00:00:00.000Z'),
      updatedAt: new Date('2026-03-12T00:00:00.000Z'),
      updatedBy: 'u1',
    };

    vi.mocked(transactionRepository.getTransactionsByProject).mockResolvedValue([] as never);
    vi.mocked(transactionRepository.getById).mockResolvedValue(sourceTransaction as never);

    vi.mocked(allocationRepository.listByProject).mockResolvedValue([
      {
        id: 'alloc-exp-1',
        sourceTransactionId: 'tx-expense-source',
        direction: 'EXPENSE',
        totalAmount: 900,
        items: [{ projectId: 'project-1', percentage: 50, amount: 450 }],
        projectIds: ['project-1'],
        createdBy: 'u1',
        date: new Date('2026-03-12T00:00:00.000Z'),
        yearMonth: '2026-03',
        createdAt: new Date('2026-03-12T00:00:00.000Z'),
        updatedAt: new Date('2026-03-12T00:00:00.000Z'),
        updatedBy: 'u1',
      },
    ] as never);

    const records = await listProjectRecordsUseCase.execute({
      householdId: 'household-1',
      projectId: 'project-1',
      yearMonth: '2026-03',
    });

    expect(records).toHaveLength(1);
    expect(records[0].amount).toBe(-450);
    expect(records[0].id).toBe('tx-expense-source:allocation:project-1');
  });
});
