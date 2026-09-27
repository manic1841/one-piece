import { describe, expect, it } from 'vitest';

import { calculateProjectBalance } from './projectBalanceCalculator';

describe('calculateProjectBalance', () => {
  it('adds direct income and subtracts expenses from the base balance', () => {
    const balance = calculateProjectBalance({
      projectId: 'project-a',
      baseBalance: 1000,
      transactions: [
        { id: 'tx-1', amount: 200, intentType: 'INCOME', intent: 'SALARY' },
        { id: 'tx-2', amount: 50, intentType: 'EXPENSE', intent: 'FOOD' },
      ],
      transfers: [],
      allocations: [],
    });

    expect(balance).toBe(1150);
  });

  it('directs transfers by toProjectId and fromProjectId', () => {
    const balance = calculateProjectBalance({
      projectId: 'project-a',
      baseBalance: 500,
      transactions: [],
      transfers: [
        { id: 'tx-in', amount: 300, intentType: 'TRANSFER', toProjectId: 'project-a' },
        { id: 'tx-out', amount: 120, intentType: 'TRANSFER', fromProjectId: 'project-a' },
        { id: 'tx-other', amount: 999, intentType: 'TRANSFER', toProjectId: 'project-b' },
      ],
      allocations: [],
    });

    expect(balance).toBe(680);
  });

  it('counts allocation amounts once and skips direct transactions', () => {
    const balance = calculateProjectBalance({
      projectId: 'project-a',
      baseBalance: 0,
      transactions: [
        {
          id: 'tx-direct',
          amount: 300,
          intentType: 'INCOME',
          intent: 'SALARY',
          projectId: 'project-a',
        },
      ],
      transfers: [],
      allocations: [
        {
          sourceTransactionId: 'tx-direct',
          direction: 'INCOME',
          items: [{ projectId: 'project-a', amount: 300 }],
        },
        {
          sourceTransactionId: 'tx-shared',
          direction: 'INCOME',
          items: [{ projectId: 'project-a', amount: 150 }],
        },
        {
          sourceTransactionId: 'tx-shared',
          direction: 'INCOME',
          items: [{ projectId: 'project-a', amount: 150 }],
        },
        {
          sourceTransactionId: 'tx-expense',
          direction: 'EXPENSE',
          items: [{ projectId: 'project-a', amount: 80 }],
        },
      ],
    });

    expect(balance).toBe(370);
  });

  it('returns the base balance when there is no activity', () => {
    const balance = calculateProjectBalance({
      projectId: 'project-a',
      baseBalance: 250,
      transactions: [],
      transfers: [],
      allocations: [],
    });

    expect(balance).toBe(250);
  });
});
