import { describe, expect, it } from 'vitest';

import { calculateProjectSettlementSnapshot } from './projectSettlementCalculator';

describe('calculateProjectSettlementSnapshot', () => {
  it('calculates income, expense, and closing balance from mixed sources', () => {
    const result = calculateProjectSettlementSnapshot({
      year: 2026,
      month: 3,
      projectId: 'project-a',
      openingBalance: 1000,
      allocations: [
        {
          direction: 'INCOME',
          items: [
            { projectId: 'project-a', amount: 300 },
            { projectId: 'project-b', amount: 700 },
          ],
        },
        {
          direction: 'EXPENSE',
          items: [{ projectId: 'project-a', amount: 200 }],
        },
      ],
      transfers: [
        {
          fromProjectId: 'project-z',
          toProjectId: 'project-a',
          amount: 400,
          intentType: 'TRANSFER',
        },
        {
          fromProjectId: 'project-a',
          toProjectId: 'project-y',
          amount: 150,
          intentType: 'TRANSFER',
        },
      ],
      projectTransactions: [
        { amount: 500, intentType: 'INCOME', intent: 'SALARY' },
        { amount: 250, intentType: 'EXPENSE', intent: 'FOOD' },
      ],
    });

    expect(result).toEqual({
      year: 2026,
      month: 3,
      openingBalance: 1000,
      income: 1200,
      expense: 600,
      closingBalance: 1600,
    });
  });

  it('handles empty inputs as zero-flow month', () => {
    const result = calculateProjectSettlementSnapshot({
      year: 2026,
      month: 4,
      projectId: 'project-a',
      openingBalance: 777,
      allocations: [],
      transfers: [],
      projectTransactions: [],
    });

    expect(result).toEqual({
      year: 2026,
      month: 4,
      openingBalance: 777,
      income: 0,
      expense: 0,
      closingBalance: 777,
    });
  });
});
